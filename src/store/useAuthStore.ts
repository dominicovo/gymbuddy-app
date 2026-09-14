import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type AuthProvider = 'apple' | 'google' | 'email';

interface PermissionState {
  screenTime: boolean;
  notifications: boolean;
  location: boolean;
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
  permissions: PermissionState;
  /** Dev escape hatch is active — no real session backs this state. */
  bypassed: boolean;

  /** Call once at app startup. Restores any existing Supabase session and subscribes to future changes. */
  init: () => void;
  /**
   * Opens the app with no Supabase session, for local development only. The
   * caller is `__DEV__`-gated; anything needing a session (profile edits) will
   * still fail, since there genuinely isn't one.
   */
  bypassAuth: () => void;
  sendEmailCode: (email: string) => Promise<{ error: string | null }>;
  /** `needsProfile` is false for returning users — they skip the card/permissions setup. */
  verifyEmailCode: (email: string, code: string) => Promise<{ error: string | null; needsProfile: boolean }>;
  setCard: (fullName: string, handle: string) => Promise<{ error: string | null; taken: boolean }>;
  setPermission: (key: keyof PermissionState, granted: boolean) => void;
  completeSignUp: () => void;
  signOut: () => Promise<void>;
}

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, handle, pair_code, member_since')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  loading: true,
  provider: null,
  email: null,
  fullName: '',
  handle: '',
  pairCode: '',
  memberSince: null,
  permissions: { screenTime: false, notifications: false, location: false },
  bypassed: false,

  init: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        set({
          isAuthenticated: !!profile?.handle,
          provider: 'email',
          email: session.user.email ?? null,
          fullName: profile?.full_name ?? '',
          handle: profile?.handle ?? '',
          pairCode: profile?.pair_code ?? '',
          memberSince: profile?.member_since ?? null,
        });
      }
      set({ loading: false });
    });

    supabase.auth.onAuthStateChange(async (event, session) => {
      // A dev bypass owns the auth state outright — Supabase's session events
      // (including the null INITIAL_SESSION) must not clobber it.
      if (get().bypassed) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        set({
          isAuthenticated: false,
          provider: null,
          email: null,
          fullName: '',
          handle: '',
          pairCode: '',
          memberSince: null,
        });
        return;
      }
      const profile = await loadProfile(session.user.id);
      set({
        provider: 'email',
        email: session.user.email ?? null,
        fullName: profile?.full_name ?? '',
        handle: profile?.handle ?? '',
        pairCode: profile?.pair_code ?? '',
        memberSince: profile?.member_since ?? null,
      });
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
    }),

  sendEmailCode: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return { error: error?.message ?? null };
  },

  verifyEmailCode: async (email, code) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.session?.user) {
      return { error: error?.message ?? 'Verification failed.', needsProfile: true };
    }
    const profile = await loadProfile(data.session.user.id);
    const hasProfile = !!profile?.handle;
    set({
      provider: 'email',
      email: data.session.user.email ?? email,
      fullName: profile?.full_name ?? '',
      handle: profile?.handle ?? '',
      pairCode: profile?.pair_code ?? '',
      memberSince: profile?.member_since ?? null,
      // A returning account is already set up — don't make them redo the card.
      isAuthenticated: hasProfile,
    });
    return { error: null, needsProfile: !hasProfile };
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

  setPermission: (key, granted) =>
    set((state) => ({ permissions: { ...state.permissions, [key]: granted } })),

  completeSignUp: () => set({ isAuthenticated: true }),

  signOut: async () => {
    // Clear the bypass first, so the auth listener is free to reset state again.
    set({ bypassed: false });
    await supabase.auth.signOut();
    set({ isAuthenticated: false, fullName: '', handle: '', pairCode: '', email: null, memberSince: null });
  },
}));
