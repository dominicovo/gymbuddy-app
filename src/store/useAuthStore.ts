import { create } from 'zustand';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { unregisterPushToken } from '../lib/push';
import { describeAuthError } from '../lib/authErrors';
import { useBuddiesStore } from './useBuddiesStore';
import { useAppStore } from './useAppStore';

export type AuthProvider = 'apple' | 'google';

interface PermissionState {
  screenTime: boolean;
  notifications: boolean;
  location: boolean;
}

/** Result of a provider sign-in. `needsName` means the provider gave us no name, so the card screen should run once. */
interface SignInResult {
  error: string | null;
  cancelled?: boolean;
  needsName?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  /** True until the initial session check (init()) resolves — gates the splash/loading state. */
  loading: boolean;
  provider: AuthProvider | null;
  email: string | null;
  fullName: string;
  handle: string;
  pairCode: string;
  memberSince: string | null;
  /** Public URL of the profile photo, or null for initials. */
  avatarUrl: string | null;
  permissions: PermissionState;
  /** Dev escape hatch is active — no real session backs this state. */
  bypassed: boolean;

  /** Call once at app startup. Restores any existing Supabase session and subscribes to future changes. */
  init: () => void;
  /**
   * Opens the app with no Supabase session, for local development only. The
   * caller is `__DEV__`-gated; anything needing a session (profile edits,
   * buddies) will still fail, since there genuinely isn't one.
   */
  bypassAuth: () => void;
  signInWithApple: () => Promise<SignInResult>;
  signInWithGoogle: () => Promise<SignInResult>;
  setCard: (fullName: string, handle: string) => Promise<{ error: string | null; taken: boolean }>;
  /** Sets the name and picks a free handle derived from it, retrying on collisions. */
  claimCard: (fullName: string) => Promise<{ error: string | null }>;
  /** Uploads a local image (file:// URI) as the profile photo. */
  setAvatar: (localUri: string) => Promise<{ error: string | null }>;
  removeAvatar: () => Promise<{ error: string | null }>;
  setPermission: (key: keyof PermissionState, granted: boolean) => void;
  signOut: () => Promise<void>;
  /** Permanently deletes the account and everything on it (profile, buddies, check-ins, photo). */
  deleteAccount: () => Promise<{ error: string | null }>;
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
}

interface ProfileRow {
  full_name: string;
  handle: string | null;
  pair_code: string;
  member_since: string;
  /** Absent until migration 005 has run. */
  avatar_url?: string | null;
}

const AVATAR_BUCKET = 'avatars';

/** Every file in the user's avatar folder except `keep` — old photos shouldn't pile up. */
async function removeOldAvatars(userId: string, keep?: string) {
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
  const stale = (data ?? []).map((f) => `${userId}/${f.name}`).filter((path) => path !== keep);
  if (stale.length > 0) await supabase.storage.from(AVATAR_BUCKET).remove(stale);
}

const profileCacheKey = (userId: string) => `gymbuddy-profile:${userId}`;

/**
 * The profile from Supabase, falling back to the last copy seen on this phone
 * — gyms are notorious for bad signal, and "Your name" isn't a good look.
 */
async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!error && data) {
    void AsyncStorage.setItem(profileCacheKey(userId), JSON.stringify(data)).catch(() => {});
    return data as ProfileRow;
  }
  const cached = await AsyncStorage.getItem(profileCacheKey(userId)).catch(() => null);
  return cached ? (JSON.parse(cached) as ProfileRow) : null;
}

const STARTUP_TIMEOUT_MS = 6000;

/** Guards against a double init() (Fast Refresh) stacking auth listeners. */
let initialized = false;

function slugFromName(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return base.length >= 3 ? base : `lifter${Math.floor(100 + Math.random() * 900)}`;
}

function withSuffix(handle: string): string {
  const suffix = String(Math.floor(100 + Math.random() * 900));
  return `${handle.slice(0, 20 - suffix.length)}${suffix}`;
}

export const useAuthStore = create<AuthState>()((set, get) => {
  /**
   * True while signInWithIdToken is in flight. The provider flow adopts the new
   * session itself; the auth listener stands aside so a slower, stale profile
   * read from it can't overwrite the name the flow just saved.
   */
  let signingIn = false;

  /** Pulls the profile into the store and marks the user signed in. */
  async function adopt(userId: string, email: string | null, provider: AuthProvider | null) {
    // Before anything routes on it: the phone's streak, schedule and apps
    // must be this account's, not whoever signed in here last.
    const [profile] = await Promise.all([loadProfile(userId), useAppStore.getState().adoptAccount(userId)]);
    set({
      isAuthenticated: true,
      provider,
      email,
      fullName: profile?.full_name ?? '',
      handle: profile?.handle ?? '',
      pairCode: profile?.pair_code ?? '',
      memberSince: profile?.member_since ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });
  }

  function clear() {
    set({
      isAuthenticated: false,
      provider: null,
      email: null,
      fullName: '',
      handle: '',
      pairCode: '',
      memberSince: null,
      avatarUrl: null,
    });
  }

  /** Shared tail of both provider flows: exchange the token, then finish the profile if the provider was name-less. */
  async function finish(provider: AuthProvider, token: string, providerName: string | null): Promise<SignInResult> {
    signingIn = true;
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({ provider, token });
      if (error || !data.session?.user) {
        if (error) console.warn(`signInWithIdToken(${provider}) failed`, error.message);
        return { error: describeAuthError(error ?? 'No session returned.') };
      }
      set({ bypassed: false });
      await adopt(data.session.user.id, data.session.user.email ?? null, provider);

      if (!get().fullName && providerName) {
        // Apple only sends the name once, on first sign-in — persist it now or lose it.
        await supabase.auth.updateUser({ data: { full_name: providerName } });
        await get().claimCard(providerName);
      }
      return { error: null, needsName: !get().fullName };
    } catch (e) {
      console.warn(`${provider} sign-in failed`, e);
      return { error: describeAuthError(e) };
    } finally {
      signingIn = false;
    }
  }

  return {
    isAuthenticated: false,
    loading: true,
    provider: null,
    email: null,
    fullName: '',
    handle: '',
    pairCode: '',
    memberSince: null,
    avatarUrl: null,
    permissions: { screenTime: false, notifications: false, location: false },
    bypassed: false,

    init: () => {
      if (initialized) return;
      initialized = true;

      // Never leave the app on a blank screen if restoring the session stalls
      // (offline, or the backend is down). Signed-out is the safe default.
      const giveUp = setTimeout(() => set({ loading: false }), STARTUP_TIMEOUT_MS);

      supabase.auth
        .getSession()
        .then(async ({ data: { session } }) => {
          if (session?.user) {
            const provider = (session.user.app_metadata?.provider as AuthProvider | undefined) ?? null;
            await adopt(session.user.id, session.user.email ?? null, provider);
          }
        })
        .catch((e) => console.warn('restoring session failed', e))
        .finally(() => {
          clearTimeout(giveUp);
          set({ loading: false });
        });

      // Supabase runs this callback while it holds its auth lock, so it must
      // not await any other Supabase call — that deadlocks sign-in. Anything
      // that talks to Supabase is deferred to the next tick instead.
      supabase.auth.onAuthStateChange((event, session) => {
        // A dev bypass owns the auth state outright — Supabase's session events
        // (including the null INITIAL_SESSION) must not clobber it.
        if (get().bypassed || signingIn) return;
        if (event === 'SIGNED_OUT' || !session?.user) {
          clear();
          return;
        }
        if (event === 'TOKEN_REFRESHED') return; // same user, nothing to reload
        const user = session.user;
        const provider = (user.app_metadata?.provider as AuthProvider | undefined) ?? null;
        setTimeout(() => void adopt(user.id, user.email ?? null, provider), 0);
      });
    },

    bypassAuth: () =>
      set({
        isAuthenticated: true,
        bypassed: true,
        loading: false,
        provider: null,
        email: null,
        fullName: 'Dev Tester',
        handle: 'devtester',
        pairCode: '0000',
        memberSince: new Date().toISOString(),
        avatarUrl: null,
      }),

    signInWithApple: async () => {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) return { error: 'Apple didn’t return a sign-in token. Please try again.' };
        const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
        return await finish('apple', credential.identityToken, name || null);
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'ERR_REQUEST_CANCELED') return { error: null, cancelled: true };
        console.warn('Apple sign-in failed', code, e);
        if (code === 'ERR_REQUEST_NOT_HANDLED' || code === 'ERR_REQUEST_UNKNOWN') {
          return { error: 'Sign in with Apple needs an Apple Account on this device. Add one in Settings, or continue with Google.' };
        }
        return { error: describeAuthError(e, 'Apple sign-in failed. Please try again.') };
      }
    },

    signInWithGoogle: async () => {
      if (!GOOGLE_WEB_CLIENT_ID) {
        return { error: __DEV__ ? 'Google sign-in is not configured: set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.' : 'Google sign-in is unavailable right now.' };
      }
      try {
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return { error: null, cancelled: true };
        const { idToken, user } = response.data;
        if (!idToken) return { error: 'Google didn’t return a sign-in token. Please try again.' };
        return await finish('google', idToken, user.name ?? null);
      } catch (e) {
        if (isErrorWithCode(e)) {
          if (e.code === statusCodes.SIGN_IN_CANCELLED) return { error: null, cancelled: true };
          if (e.code === statusCodes.IN_PROGRESS) return { error: null, cancelled: true };
        }
        console.warn('Google sign-in failed', e);
        return { error: describeAuthError(e, 'Google sign-in failed. Please try again.') };
      }
    },

    setCard: async (fullName, handle) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return { error: 'Not signed in.', taken: false };

      const { error } = await supabase.from('profiles').update({ full_name: fullName, handle }).eq('id', data.user.id);
      if (error) {
        const taken = error.code === '23505';
        return { error: taken ? 'That handle is already taken.' : error.message, taken };
      }
      set({ fullName, handle });
      return { error: null, taken: false };
    },

    claimCard: async (fullName) => {
      const base = slugFromName(fullName);
      let result = await get().setCard(fullName, base);
      for (let i = 0; i < 3 && result.taken; i++) {
        result = await get().setCard(fullName, withSuffix(base));
      }
      return { error: result.error };
    },

    setAvatar: async (localUri) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return { error: 'Sign in to save a profile photo.' };
      const userId = data.user.id;

      let body: ArrayBuffer;
      try {
        body = await (await fetch(localUri)).arrayBuffer();
      } catch {
        return { error: 'Could not read that photo. Try another one.' };
      }

      // A new file name each time, so buddies' cached copies of the old photo don't linger.
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const upload = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, body, { contentType: 'image/jpeg', upsert: true });
      if (upload.error) return { error: upload.error.message };

      const avatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
      if (error) return { error: error.message };

      set({ avatarUrl });
      void removeOldAvatars(userId, path);
      return { error: null };
    },

    removeAvatar: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return { error: 'Not signed in.' };
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', data.user.id);
      if (error) return { error: error.message };
      set({ avatarUrl: null });
      void removeOldAvatars(data.user.id);
      return { error: null };
    },

    setPermission: (key, granted) =>
      set((state) => ({ permissions: { ...state.permissions, [key]: granted } })),

    signOut: async () => {
      // Clear the bypass first, so the auth listener is free to reset state again.
      set({ bypassed: false });
      // While the session still exists: this phone stops getting this account's notifications.
      await unregisterPushToken();
      if (get().provider === 'google') {
        await GoogleSignin.signOut().catch(() => {});
      }
      // 'local' ends the session on this phone even when offline; the server
      // token simply expires. A network failure must never trap someone signed in.
      await supabase.auth.signOut({ scope: 'local' }).catch((e) => console.warn('signOut failed', e));
      useBuddiesStore.setState({ buddies: [], invites: [], outgoingPending: 0, inbox: [], sentToday: [] });
      clear();
    },

    deleteAccount: async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return { error: 'Not signed in.' };

      // Storage files can't be removed from SQL, so the photo goes first.
      await removeOldAvatars(userId).catch(() => {});
      const { error } = await supabase.rpc('delete_account');
      if (error) {
        console.warn('delete_account failed', error.message);
        return { error: describeAuthError(error, 'Could not delete your account. Please try again.') };
      }
      // Nothing of the deleted account stays on the phone — including its app locks.
      useAppStore.getState().restartOnboarding();
      useAppStore.setState({ ownerId: null });
      if (get().provider === 'google') await GoogleSignin.revokeAccess().catch(() => {});
      await AsyncStorage.removeItem(profileCacheKey(userId)).catch(() => {});
      await get().signOut();
      return { error: null };
    },
  };
});
