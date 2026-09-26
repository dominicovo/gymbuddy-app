import { ALL_DAYS, DayOfWeek, Schedule } from '../types';

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dayOfWeek(date: Date): DayOfWeek {
  return ALL_DAYS[date.getDay()];
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** How far through today's lock window `now` is (0–1), and minutes left until it closes. */
export function windowProgress(schedule: Schedule, now: Date): { elapsedRatio: number; remainingMinutes: number } {
  const nowMinutes = minutesSinceMidnight(now);
  const start = parseTimeToMinutes(schedule.windowStart);
  let end = parseTimeToMinutes(schedule.windowEnd);
  if (end <= start) end += 24 * 60; // crosses midnight

  const total = end - start;
  const elapsed = Math.min(Math.max(nowMinutes - start, 0), total);
  return {
    elapsedRatio: total > 0 ? elapsed / total : 0,
    remainingMinutes: total - elapsed,
  };
}

export function isScheduledDay(schedule: Schedule, date: Date): boolean {
  return schedule.days.includes(dayOfWeek(date));
}

export function isWithinLockWindow(schedule: Schedule, now: Date): boolean {
  if (!isScheduledDay(schedule, now)) return false;
  const nowMinutes = minutesSinceMidnight(now);
  const start = parseTimeToMinutes(schedule.windowStart);
  const end = parseTimeToMinutes(schedule.windowEnd);
  if (start <= end) {
    return nowMinutes >= start && nowMinutes < end;
  }
  // window crosses midnight
  return nowMinutes >= start || nowMinutes < end;
}

// Checks whether any scheduled gym day was missed strictly between
// lastProofDate and today (both exclusive). Used to decide whether a
// new proof continues the streak or resets it.
export function missedScheduledDaySince(
  schedule: Schedule,
  lastProofDate: string | null,
  today: Date
): boolean {
  if (!lastProofDate) return false;

  const last = new Date(lastProofDate + 'T00:00:00');
  const cursor = new Date(last);
  cursor.setDate(cursor.getDate() + 1);

  const todayMidnight = new Date(toISODate(today) + 'T00:00:00');

  let guard = 0;
  while (cursor < todayMidnight && guard < 365) {
    if (isScheduledDay(schedule, cursor)) return true;
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return false;
}

/** Days in calendar order (Mon first), whatever order they were tapped in. */
export function sortDays(days: DayOfWeek[]): DayOfWeek[] {
  const order: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return order.filter((d) => days.includes(d));
}

/** "Mon · Wed · Fri", or "Weekdays" / "Every day" / "Weekends" when it's one of those. */
export function formatDays(days: DayOfWeek[]): string {
  const sorted = sortDays(days);
  const key = sorted.join(',');
  if (sorted.length === 0) return 'No days';
  if (sorted.length === 7) return 'Every day';
  if (key === 'Mon,Tue,Wed,Thu,Fri') return 'Weekdays';
  if (key === 'Sat,Sun') return 'Weekends';
  return sorted.join(' · ');
}

function atMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/**
 * The next moment apps will lock: the start of a scheduled window plus the
 * grace period. Skips today once proof is in. Null if no days are scheduled.
 */
export function nextLockAt(schedule: Schedule, graceMinutes: number, now: Date, provedToday: boolean): Date | null {
  const lockMinutes = parseTimeToMinutes(schedule.windowStart) + graceMinutes;
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    if (!isScheduledDay(schedule, day)) continue;
    if (offset === 0 && provedToday) continue;
    const at = atMinutes(day, lockMinutes);
    if (at > now) return at;
  }
  return null;
}

/** When today's window closes (end of the window that is open now). */
export function windowClosesAt(schedule: Schedule, now: Date): Date {
  const start = parseTimeToMinutes(schedule.windowStart);
  const end = parseTimeToMinutes(schedule.windowEnd);
  const close = atMinutes(now, end);
  // Overnight window, and we're in the evening half: it closes tomorrow.
  if (end <= start && minutesSinceMidnight(now) >= start) close.setDate(close.getDate() + 1);
  return close;
}

/** True once today's window has ended without proof (same-day windows only). */
export function windowEndedToday(schedule: Schedule, now: Date): boolean {
  if (!isScheduledDay(schedule, now)) return false;
  const start = parseTimeToMinutes(schedule.windowStart);
  const end = parseTimeToMinutes(schedule.windowEnd);
  return end > start && minutesSinceMidnight(now) >= end;
}
