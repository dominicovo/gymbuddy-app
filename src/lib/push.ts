import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { demoFlag } from '../dev/demoFlag';

// Push notifications for nudges, cheers and buddy requests. The phone's APNs
// token is registered in Supabase; the `notify` Edge Function sends through
// Apple after the app reports what it just did (see supabase/functions/notify).

// Buddy notifications show even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationStatus = 'granted' | 'denied' | 'undetermined';

export async function notificationStatus(): Promise<NotificationStatus> {
  if (__DEV__ && demoFlag.active) return 'granted'; // no permission card in screenshots
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** Shows the iOS prompt (only possible once), then registers this phone if allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (granted) await registerPushToken();
  return granted;
}

// What this phone last registered, so sign-out knows what to remove without
// asking iOS again, and a burst of calls (fetch + token event) sends it once.
let registered: { userId: string; token: string; at: number } | null = null;
const REGISTER_DEDUPE_MS = 60 * 1000;

async function deviceToken(): Promise<string | null> {
  if (!(await Notifications.getPermissionsAsync()).granted) return null;
  // Note: every call makes iOS fire the token event too, so this must never
  // be called from an addPushTokenListener callback (that loops forever).
  const token = await Notifications.getDevicePushTokenAsync();
  return token.type === 'ios' && typeof token.data === 'string' ? token.data : null;
}

/**
 * Links this phone to the signed-in account. Silent no-op without a session
 * or permission. Pass `token` when iOS has just handed one over (the token
 * listener) — never re-request it there.
 */
export async function registerPushToken(token?: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const deviceTokenHex = token ?? (await deviceToken());
    if (!deviceTokenHex) return;
    // Only skip a repeat within a minute: the server may have dropped the row
    // since (stale-token cleanup, another account on this phone), so later
    // calls — every time the app comes to the foreground — re-claim it.
    if (registered?.userId === userId && registered.token === deviceTokenHex && Date.now() - registered.at < REGISTER_DEDUPE_MS) return;
    const { error } = await supabase.rpc('register_push_token', { device_token: deviceTokenHex });
    if (error) {
      // PGRST202: the server hasn't been set up for push yet (migration 008).
      if (error.code !== 'PGRST202') console.warn('register_push_token failed', error.message);
      return;
    }
    registered = { userId, token: deviceTokenHex, at: Date.now() };
  } catch (error) {
    console.warn('registerPushToken failed', error);
  }
}

/** Before signing out: stop this account's notifications arriving on this phone. */
export async function unregisterPushToken(): Promise<void> {
  const current = registered;
  registered = null;
  if (!current) return;
  try {
    const { error } = await supabase.rpc('unregister_push_token', { device_token: current.token });
    if (error && error.code !== 'PGRST202') console.warn('unregister_push_token failed', error.message);
  } catch (error) {
    console.warn('unregisterPushToken failed', error);
  }
}

export type BuddyEvent = { event: 'nudges'; ids: string[] } | { event: 'request' | 'accepted'; linkId: string };

/**
 * Tells the server to notify the other person. Fire-and-forget: the nudge or
 * request itself already succeeded, and the server checks it really happened.
 */
export function notifyBuddy(event: BuddyEvent): void {
  if (event.event === 'nudges' && event.ids.length === 0) return;
  void supabase.functions
    .invoke('notify', { body: event })
    .then(({ error }) => {
      if (error) console.warn('notify failed', error.message);
    })
    .catch((error) => console.warn('notify failed', error));
}
