import { supabase } from './supabase';
import { Schedule } from '../types';

// Mirrors local activity to Supabase so buddies can see it. The device stays
// the source of truth for the user's own data; these writes are best-effort
// and never block the local flow. With no session (dev bypass, signed out)
// they are silent no-ops.

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Records today's proof and the resulting streak for buddies to read. */
export async function syncCheckIn(day: string, streak: number): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;

  const [checkIn, profile] = await Promise.all([
    // Already checked in today (second device, start over): keep the first. There's
    // no update policy on check_ins, so a merging upsert would be refused.
    supabase.from('check_ins').upsert({ user_id: userId, day }, { onConflict: 'user_id,day', ignoreDuplicates: true }),
    supabase.from('profiles').update({ streak }).eq('id', userId),
  ]);
  if (checkIn.error) console.warn('syncCheckIn: check_in failed', checkIn.error.message);
  if (profile.error) console.warn('syncCheckIn: streak failed', profile.error.message);
}

/** Publishes the lock schedule so buddies can tell a rest day from a missed one. */
export async function syncSchedule(schedule: Schedule): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;

  const { error } = await supabase.from('schedules').upsert({
    user_id: userId,
    days: schedule.days,
    window_start: schedule.windowStart,
    window_end: schedule.windowEnd,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('syncSchedule failed', error.message);
}

export interface ServerProgress {
  /** Local calendar days with a check-in, oldest first. */
  checkIns: string[];
  lastCheckedInAt: string | null;
  streak: number;
  schedule: Schedule | null;
  /** True when the account has any history at all on the server. */
  hasHistory: boolean;
}

/** The account's own history, for a phone it hasn't been used on (or one another account used). */
export async function fetchServerProgress(userId: string): Promise<ServerProgress | null> {
  const [checkIns, profile, schedule] = await Promise.all([
    supabase.from('check_ins').select('day, checked_in_at').eq('user_id', userId).order('day'),
    supabase.from('profiles').select('streak').eq('id', userId).maybeSingle(),
    supabase.from('schedules').select('days, window_start, window_end').eq('user_id', userId).maybeSingle(),
  ]);
  if (checkIns.error || profile.error || schedule.error) {
    console.warn('fetchServerProgress failed', checkIns.error?.message ?? profile.error?.message ?? schedule.error?.message);
    return null;
  }
  const rows = (checkIns.data ?? []) as { day: string; checked_in_at: string }[];
  const s = schedule.data as { days: string[]; window_start: string; window_end: string } | null;
  return {
    checkIns: rows.map((r) => r.day),
    lastCheckedInAt: rows.length ? rows[rows.length - 1].checked_in_at : null,
    streak: (profile.data as { streak: number } | null)?.streak ?? 0,
    schedule: s ? { days: s.days as Schedule['days'], windowStart: s.window_start, windowEnd: s.window_end } : null,
    hasHistory: rows.length > 0 || !!s,
  };
}
