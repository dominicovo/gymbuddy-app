import * as DeviceActivity from 'react-native-device-activity';
import type { ShieldAction, ShieldActions, ShieldConfiguration } from 'react-native-device-activity';
import { DayOfWeek, Schedule } from '../types';
import { formatHHMM } from './time';

type UIColor = { red: number; green: number; blue: number; alpha?: number };

function rgb(hex: string, alpha = 1): UIColor {
  const value = hex.replace('#', '');
  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16),
    alpha,
  };
}

const ACTIVITY_NAME = 'gymbuddy-lock-window';
const SELECTION_ID = 'gymbuddy-locked-apps';

// Foundation's Calendar weekday numbering: 1 = Sunday ... 7 = Saturday.
const WEEKDAY_NUMBER: Record<DayOfWeek, number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

export function isScreenTimeAvailable(): boolean {
  return DeviceActivity.isAvailable();
}

/**
 * Asks for Screen Time access. Resolves to whether it was granted — never
 * rejects. iOS reports "Don't Allow" (and the simulator, which can't grant it)
 * as an exception, but to every caller that just means "no".
 */
export async function requestScreenTimeAuthorization(): Promise<boolean> {
  try {
    await DeviceActivity.requestAuthorization('individual');
  } catch (error) {
    console.info('Screen Time authorization not granted', error);
  }
  return DeviceActivity.getAuthorizationStatus() === DeviceActivity.AuthorizationStatus.approved;
}

export function hasScreenTimeAuthorization(): boolean {
  return DeviceActivity.getAuthorizationStatus() === DeviceActivity.AuthorizationStatus.approved;
}

/** Ground truth: is the OS actually shielding the selected apps right now? */
export function isShieldActive(): boolean {
  return DeviceActivity.isShieldActive();
}

/** Persists the user's raw app/category selection under our fixed selection id. */
export function saveAppSelection(familyActivitySelection: string) {
  DeviceActivity.setFamilyActivitySelectionId({
    id: SELECTION_ID,
    familyActivitySelection,
  });
}

function hhmmToDateComponents(hhmm: string, offsetMinutes = 0) {
  const [hour, minute] = hhmm.split(':').map(Number);
  const total = ((hour * 60 + minute + offsetMinutes) % (24 * 60) + 24 * 60) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/**
 * Registers the daily lock window and what should happen at each edge of it.
 * Apple's DeviceActivitySchedule has no concept of "Mon/Wed/Fri only" — it's
 * a daily recurring window — so the gym-day filter lives in the extension
 * (see targets/ActivityMonitorExtension), gated off `gymDays` written here.
 *
 * `graceMinutes` delays the actual lock (not the displayed window) so users
 * get a few free minutes after the window opens before apps shield.
 */
export async function startScreenTimeMonitoring(schedule: Schedule, graceMinutes = 0): Promise<void> {
  DeviceActivity.userDefaultsSet(
    'gymDays',
    schedule.days.map((day) => WEEKDAY_NUMBER[day])
  );

  DeviceActivity.configureActions({
    activityName: ACTIVITY_NAME,
    callbackName: 'intervalDidStart',
    actions: [{ type: 'blockSelection', familyActivitySelectionId: SELECTION_ID }],
  });

  DeviceActivity.configureActions({
    activityName: ACTIVITY_NAME,
    callbackName: 'intervalDidEnd',
    actions: [{ type: 'unblockSelection', familyActivitySelectionId: SELECTION_ID }],
  });

  await DeviceActivity.startMonitoring(
    ACTIVITY_NAME,
    {
      intervalStart: hhmmToDateComponents(schedule.windowStart, graceMinutes),
      intervalEnd: hhmmToDateComponents(schedule.windowEnd),
      repeats: true,
    },
    []
  );
}

export function stopScreenTimeMonitoring() {
  DeviceActivity.stopMonitoring([ACTIVITY_NAME]);
  DeviceActivity.unblockSelection({ activitySelectionId: SELECTION_ID });
}

/** Immediately lifts the shield — called when proof is submitted. */
export function unlockNow() {
  DeviceActivity.unblockSelection({ activitySelectionId: SELECTION_ID });
}

/** Diagnostic only: shields the current selection immediately, bypassing the schedule. */
export function lockNowForTesting() {
  DeviceActivity.blockSelection({ activitySelectionId: SELECTION_ID });
}

/**
 * Pushes fresh copy to the native shield (the full-screen overlay Apple shows
 * over a blocked app). Apple's ShieldConfiguration API only supports an icon,
 * a title/subtitle pair and two buttons — no custom stat tiles or activity
 * feeds — so the "day streak" / "distance to gym" numbers stay app-side.
 * Call this whenever the schedule, gym, or streak changes.
 */
export function updateShieldCopy(params: { schedule: Schedule; gymName: string | null; streak: number }) {
  const { schedule, gymName, streak } = params;
  const gym = gymName ?? 'your gym';
  const streakLine = streak > 0 ? ` ${streak} day${streak === 1 ? '' : 's'} in a row.` : '';

  const configuration: ShieldConfiguration = {
    backgroundColor: rgb('#121218'),
    iconSystemName: 'lock.fill',
    iconTint: rgb('#8A85F0'),
    title: '{applicationOrDomainDisplayName} is locked',
    titleColor: rgb('#FFFFFF'),
    subtitle: `Your gym window is open until ${formatHHMM(schedule.windowEnd)}. Check in at ${gym} and everything unlocks for the day.${streakLine}`,
    subtitleColor: rgb('#A8A6B3'),
    primaryButtonLabel: "I'm at the gym",
    primaryButtonLabelColor: rgb('#08070C'),
    primaryButtonBackgroundColor: rgb('#8B84F0'),
    secondaryButtonLabel: 'Not now',
    secondaryButtonLabelColor: rgb('#A8A6B3'),
  };

  // Opens GymBuddy (the `gymbuddy://` scheme, registered in app.json) so the
  // user lands back on the Unlock tab's "I'm at the Gym" flow.
  const primary = { behavior: 'close', type: 'openUrl', url: 'gymbuddy://' } as unknown as ShieldAction;
  const secondary: ShieldAction = { behavior: 'close' };

  const actions: ShieldActions = { primary, secondary };

  DeviceActivity.updateShield(configuration, actions);
}
