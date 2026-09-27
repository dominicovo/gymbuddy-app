import { LogBox } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { Buddy, InboxNudge, Invite, useBuddiesStore } from '../store/useBuddiesStore';
import { dayOfWeek, toISODate } from '../lib/schedule';
import { DayOfWeek } from '../types';
import { demoFlag } from './demoFlag';

// Dev-only sample data for App Store screenshots: a fictional user whose apps
// are locked right now, with a streak, 12 weeks of history and a full buddy
// list. Built relative to the current time so every screen is consistent on
// whatever day it's run. Never shipped: the only entry point is behind __DEV__.

const DAY_MS = 24 * 60 * 60 * 1000;

/** The app's clock in demo mode: 6:40 PM today, inside a 6 AM – 8 PM window. */
export const DEMO_HOUR = 18;
export const DEMO_MINUTE = 40;

/**
 * Screenshots shouldn't depend on when they're taken. Shift the JS clock so
 * `new Date()` / `Date.now()` read DEMO_HOUR:DEMO_MINUTE today (timers are
 * unaffected). Dev only, and only after loadDemo().
 */
function freezeClockForScreenshots() {
  const RealDate = Date;
  const target = new RealDate();
  target.setHours(DEMO_HOUR, DEMO_MINUTE, 0, 0);
  const offset = target.getTime() - RealDate.now();
  class DemoDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...(args as [string | number | Date]));
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  (globalThis as { Date: DateConstructor }).Date = DemoDate as unknown as DateConstructor;
}

function at(date: Date, hours: number, minutes: number): string {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

/** Minutes before now, as an ISO timestamp — always earlier today. */
function minutesAgo(now: Date, minutes: number): string {
  const d = new Date(now.getTime() - minutes * 60 * 1000);
  if (toISODate(d) !== toISODate(now)) d.setTime(new Date(now).setHours(0, 5, 0, 0));
  return d.toISOString();
}

export function loadDemo(): void {
  if (!__DEV__) return;
  LogBox.ignoreAllLogs(true);
  demoFlag.active = true;
  freezeClockForScreenshots();

  const now = new Date();
  const today = toISODate(now);
  const todayDow = dayOfWeek(now);

  // Today is always a gym day, and the window is open with the grace period over.
  const days = Array.from(new Set<DayOfWeek>(['Mon', 'Wed', 'Fri', todayDow]));
  const windowStart = '06:00';
  const windowEnd = '20:00';

  // 12 weeks of scheduled days: the last 12 are all checked in (the live
  // streak), a few older ones missed so the grid looks lived-in.
  const scheduled: string[] = [];
  for (let i = 84; i >= 1; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    if (days.includes(dayOfWeek(d))) scheduled.push(toISODate(d));
  }
  const missed = new Set([scheduled.length - 14, scheduled.length - 19, scheduled.length - 27, scheduled.length - 31]);
  const checkIns = scheduled.filter((_, i) => !missed.has(i));
  const lastDay = checkIns[checkIns.length - 1];

  useAuthStore.setState({
    isAuthenticated: true,
    bypassed: true,
    loading: false,
    provider: null,
    email: null,
    fullName: 'Alex Morgan',
    handle: 'alexmorgan',
    pairCode: '4821',
    memberSince: new Date(now.getTime() - 120 * DAY_MS).toISOString(),
    avatarUrl: null,
  });

  useAppStore.setState({
    introSeen: true,
    onboardingComplete: true,
    appSelection: { applicationCount: 5, categoryCount: 2, webDomainCount: 0 },
    schedule: { days, windowStart, windowEnd },
    gymLocation: null,
    streak: 12,
    longestStreak: 21,
    lastProofDate: lastDay,
    lastProofAt: at(new Date(lastDay + 'T00:00:00'), 7, 12),
    startedAt: scheduled[0],
    checkIns,
    graceMinutes: 15,
    strictMode: true,
  });

  const lastRestDay = (() => {
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() - i * DAY_MS);
      if (dayOfWeek(d) !== todayDow) return toISODate(d);
    }
    return today;
  })();

  const buddy = (
    n: number,
    name: string,
    handle: string,
    streak: number,
    buddyDays: DayOfWeek[],
    lastCheckInDay: string | null,
    lastCheckedInAt: string | null
  ): Buddy => ({
    linkId: `demo-link-${n}`,
    userId: `demo-user-${n}`,
    name,
    handle,
    initials: name
      .split(' ')
      .map((p) => p[0])
      .join(''),
    streak,
    days: buddyDays,
    lastCheckInDay,
    lastCheckedInAt,
    avatarUrl: null,
  });

  const everyDay: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const withToday = (d: DayOfWeek[]) => Array.from(new Set<DayOfWeek>([...d, todayDow]));
  const withoutToday = (d: DayOfWeek[]) => d.filter((x) => x !== todayDow);

  const buddies: Buddy[] = [
    // In today
    buddy(1, 'Maya Chen', 'mayachen', 23, everyDay, today, minutesAgo(now, 185)),
    buddy(2, 'Jordan Okafor', 'jordanlifts', 9, withToday(['Mon', 'Wed', 'Fri']), today, minutesAgo(now, 95)),
    buddy(3, 'Priya Patel', 'priyap', 15, withToday(['Tue', 'Thu']), today, minutesAgo(now, 40)),
    // Still to go today
    buddy(4, 'Sam Rivera', 'samrivera', 31, withToday(['Mon', 'Tue', 'Thu']), lastRestDay, at(new Date(lastRestDay + 'T00:00:00'), 18, 5)),
    buddy(5, 'Leo Martins', 'leom', 4, withToday(['Wed', 'Sat']), lastRestDay, at(new Date(lastRestDay + 'T00:00:00'), 6, 50)),
    buddy(6, 'Aisha Bello', 'aishab', 2, withToday(['Mon', 'Fri']), null, null),
    // Rest day
    buddy(7, 'Chris Walker', 'chrisw', 7, withoutToday(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']), lastRestDay, at(new Date(lastRestDay + 'T00:00:00'), 12, 30)),
    buddy(8, 'Tom Nguyen', 'tomnguyen', 11, withoutToday(['Tue', 'Thu', 'Sat']), lastRestDay, at(new Date(lastRestDay + 'T00:00:00'), 19, 20)),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const invites: Invite[] = [{ linkId: 'demo-invite-1', name: 'Nina Park', handle: 'ninapark', initials: 'NP' }];

  const inbox: InboxNudge[] = [
    { id: 'demo-nudge-1', fromId: 'demo-user-1', fromName: 'Maya Chen', kind: 'nudge', createdAt: minutesAgo(now, 20), fromAvatarUrl: null },
    { id: 'demo-nudge-2', fromId: 'demo-user-2', fromName: 'Jordan Okafor', kind: 'nudge', createdAt: minutesAgo(now, 55), fromAvatarUrl: null },
  ];

  useBuddiesStore.setState({
    buddies,
    invites,
    outgoingPending: 0,
    loading: false,
    needsAccount: false,
    inbox,
    sentToday: [],
    nudgesReady: true,
  });
}
