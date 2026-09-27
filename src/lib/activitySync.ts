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
