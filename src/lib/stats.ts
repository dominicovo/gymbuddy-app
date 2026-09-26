import { Schedule } from '../types';
import { isScheduledDay, missedScheduledDaySince, toISODate } from './schedule';

/**
 * The streak as it stands right now. The stored streak is only recomputed on
 * the next check-in, so a scheduled day that has already passed without proof
 * means the streak is really over — show 0, not the stale number.
 */
export function liveStreak(schedule: Schedule | null, streak: number, lastProofDate: string | null, now: Date): number {
  if (!schedule || !lastProofDate) return streak;
  return missedScheduledDaySince(schedule, lastProofDate, now) ? 0 : streak;
}

export type DayCell = 'done' | 'missed' | 'rest' | 'upcoming' | 'before';

export interface HistoryStats {
  total: number;
  thisMonth: number;
  /** Share of scheduled days in the last 28 that got a check-in, 0–100. Null with nothing to measure yet. */
  attendance: number | null;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** How a single calendar day reads in the history. `startedAt` is when lock scheduling began. */
export function classifyDay(
  date: Date,
  schedule: Schedule | null,
  checkIns: Set<string>,
  startedAt: string | null,
  now: Date
): DayCell {
  const iso = toISODate(date);
  if (checkIns.has(iso)) return 'done';
  const day = startOfDay(date);
  const today = startOfDay(now);
  if (day > today) return 'upcoming';
  if (startedAt && iso < startedAt) return 'before';
  if (!schedule || !isScheduledDay(schedule, date)) return 'rest';
  // Today isn't missed until it's over.
  return day.getTime() === today.getTime() ? 'upcoming' : 'missed';
}

export function historyStats(
  schedule: Schedule | null,
  checkIns: string[],
  startedAt: string | null,
  now: Date
): HistoryStats {
  const set = new Set(checkIns);
  const monthPrefix = toISODate(now).slice(0, 7);

  let scheduled = 0;
  let attended = 0;
  for (let i = 1; i <= 28; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const cell = classifyDay(d, schedule, set, startedAt, now);
    if (cell === 'done' || cell === 'missed') {
      scheduled++;
      if (cell === 'done') attended++;
    }
  }

  return {
    total: set.size,
    thisMonth: checkIns.filter((d) => d.startsWith(monthPrefix)).length,
    attendance: scheduled > 0 ? Math.round((attended / scheduled) * 100) : null,
  };
}

/**
 * The last `weeks` weeks as Monday-first columns, oldest on the left, for
 * the consistency grid. Each column is 7 cells, Mon → Sun.
 */
export function historyGrid(
  schedule: Schedule | null,
  checkIns: string[],
  startedAt: string | null,
  now: Date,
  weeks = 12
): { date: string; cell: DayCell }[][] {
  const set = new Set(checkIns);
  const mondayOffset = (now.getDay() + 6) % 7;
  const firstMonday = startOfDay(now);
  firstMonday.setDate(firstMonday.getDate() - mondayOffset - (weeks - 1) * 7);

  const columns: { date: string; cell: DayCell }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: { date: string; cell: DayCell }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(firstMonday);
      date.setDate(firstMonday.getDate() + w * 7 + d);
      column.push({ date: toISODate(date), cell: classifyDay(date, schedule, set, startedAt, now) });
    }
    columns.push(column);
  }
  return columns;
}
