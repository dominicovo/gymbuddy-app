import { DayOfWeek, Schedule } from '../types';
import { dayOfWeek, toISODate } from './schedule';

export interface WeekDayStatus {
  day: DayOfWeek;
  date: string;
  scheduled: boolean;
  done: boolean;
  isToday: boolean;
}

/** Monday-start view of the current week, with completion status per scheduled day. */
export function getThisWeek(schedule: Schedule | null, checkIns: string[], now: Date): WeekDayStatus[] {
  const todayIso = toISODate(now);
  const mondayOffset = (now.getDay() + 6) % 7; // days since Monday (0=Sun -> 6)
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);

  const days: WeekDayStatus[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISODate(d);
    const day = dayOfWeek(d);
    days.push({
      day,
      date: iso,
      scheduled: schedule?.days.includes(day) ?? false,
      done: checkIns.includes(iso),
      isToday: iso === todayIso,
    });
  }
  return days;
}

export function weekSummary(days: WeekDayStatus[]): { done: number; total: number } {
  const scheduled = days.filter((d) => d.scheduled);
  return { done: scheduled.filter((d) => d.done).length, total: scheduled.length };
}
