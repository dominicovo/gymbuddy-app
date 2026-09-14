import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LockState, Schedule } from '../types';
import { isWithinLockWindow, missedScheduledDaySince, toISODate } from '../lib/schedule';
import { isShieldActive, stopScreenTimeMonitoring, unlockNow, updateShieldCopy } from '../lib/screenTime';
import { ResolvedLocation } from '../lib/location';
import { stepHHMM } from '../lib/time';

export interface AppSelectionSummary {
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
}

interface AppState {
  onboardingComplete: boolean;
  appSelection: AppSelectionSummary | null;
  schedule: Schedule | null;
  gymLocation: ResolvedLocation | null;
  streak: number;
  longestStreak: number;
  lastProofDate: string | null;
  /** ISO dates (YYYY-MM-DD) proof was submitted on, for the "this week" tracker. */
  checkIns: string[];
  /** How close (meters) you need to be to your gym for proof to count. */
  checkInRadiusMeters: number;
  /** Minutes after the window opens before apps actually lock. */
  graceMinutes: number;
  /** Blocks editing the schedule or locked apps while the window is open. */
  strictMode: boolean;

  setAppSelection: (summary: AppSelectionSummary) => void;
  setSchedule: (schedule: Schedule) => void;
  setGymLocation: (location: ResolvedLocation) => void;
  setCheckInRadiusMeters: (meters: number) => void;
  setGraceMinutes: (minutes: number) => void;
  setStrictMode: (enabled: boolean) => void;
  completeOnboarding: () => void;
  submitProof: () => void;
  getLockState: () => LockState;
  resetProgress: () => void;
  restartOnboarding: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboardingComplete: false,
      appSelection: null,
      schedule: null,
      gymLocation: null,
      streak: 0,
      longestStreak: 0,
      lastProofDate: null,
      checkIns: [],
      checkInRadiusMeters: 150,
      graceMinutes: 15,
      strictMode: true,

      setAppSelection: (summary) => set({ appSelection: summary }),

      setSchedule: (schedule) => set({ schedule }),

      setGymLocation: (location) => set({ gymLocation: location }),

      setCheckInRadiusMeters: (meters) => set({ checkInRadiusMeters: meters }),

      setGraceMinutes: (minutes) => set({ graceMinutes: minutes }),

      setStrictMode: (enabled) => set({ strictMode: enabled }),

      completeOnboarding: () => set({ onboardingComplete: true }),

      submitProof: () => {
        const { schedule, gymLocation, lastProofDate, streak, longestStreak, checkIns } = get();
        const now = new Date();
        const today = toISODate(now);

        if (lastProofDate === today) return; // already proved today

        const continued = schedule ? !missedScheduledDaySince(schedule, lastProofDate, now) : true;
        const nextStreak = continued ? streak + 1 : 1;

        unlockNow();
        if (schedule) {
          updateShieldCopy({ schedule, gymName: gymLocation?.label ?? null, streak: nextStreak });
        }

        set({
          lastProofDate: today,
          streak: nextStreak,
          longestStreak: Math.max(longestStreak, nextStreak),
          checkIns: [...checkIns, today],
        });
      },

      getLockState: () => {
        const { schedule, onboardingComplete, lastProofDate, graceMinutes } = get();
        if (!onboardingComplete || !schedule) return 'inactive';

        const now = new Date();
        const today = toISODate(now);
        if (lastProofDate === today) return 'unlocked';

        // The OS shield is ground truth — if it's actually active, trust that
        // over our own clock math (Apple's schedule trigger can lag a bit).
        if (isShieldActive()) return 'locked';

        const effectiveSchedule = { ...schedule, windowStart: stepHHMM(schedule.windowStart, graceMinutes) };
        return isWithinLockWindow(effectiveSchedule, now) ? 'locked' : 'inactive';
      },

      resetProgress: () => set({ streak: 0, longestStreak: 0, lastProofDate: null, checkIns: [] }),

      restartOnboarding: () => {
        stopScreenTimeMonitoring();
        set({
          onboardingComplete: false,
          appSelection: null,
          schedule: null,
          gymLocation: null,
          streak: 0,
          longestStreak: 0,
          lastProofDate: null,
          checkIns: [],
        });
      },
    }),
    {
      name: 'gymbuddy-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
