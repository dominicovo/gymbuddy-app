import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LockState, Schedule } from '../types';
import { isWithinLockWindow, missedScheduledDaySince, toISODate } from '../lib/schedule';
import { isShieldActive, stopScreenTimeMonitoring, unlockNow, updateShieldCopy } from '../lib/screenTime';
import { ResolvedLocation } from '../lib/location';
import { stepHHMM } from '../lib/time';
import { fetchServerProgress, syncCheckIn, syncSchedule } from '../lib/activitySync';

export interface AppSelectionSummary {
  applicationCount: number;
  categoryCount: number;
  webDomainCount: number;
}

interface AppState {
  /** The pre-sign-in welcome tour has been seen (or skipped) on this phone. */
  introSeen: boolean;
  /**
   * The account everything below belongs to. Progress lives on the phone, so
   * without this, whoever signs in next would inherit the last person's
   * streak, schedule and locked apps.
   */
  ownerId: string | null;
  onboardingComplete: boolean;
  appSelection: AppSelectionSummary | null;
  schedule: Schedule | null;
  gymLocation: ResolvedLocation | null;
  streak: number;
  longestStreak: number;
  lastProofDate: string | null;
  /** Exact time of the latest proof, for "Checked in at 7:12 AM". */
  lastProofAt: string | null;
  /** ISO date lock scheduling began — days before it don't count as missed in the history. */
  startedAt: string | null;
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
  markIntroSeen: () => void;
  completeOnboarding: () => void;
  /** Records today's proof and unlocks. Returns the resulting streak. */
  submitProof: () => number;
  getLockState: () => LockState;
  resetProgress: () => void;
  restartOnboarding: () => void;
  /** Called on every sign-in: makes the local progress this account's own. */
  adoptAccount: (userId: string) => Promise<void>;
}

// Everything that belongs to one person, as a fresh account starts out.
const EMPTY_PROGRESS = {
  onboardingComplete: false,
  appSelection: null,
  schedule: null,
  gymLocation: null,
  streak: 0,
  longestStreak: 0,
  lastProofDate: null,
  lastProofAt: null,
  startedAt: null,
  checkIns: [] as string[],
  checkInRadiusMeters: 150,
  graceMinutes: 15,
  strictMode: true,
};

function persistedStateLoaded(): Promise<void> {
  if (useAppStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useAppStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

// Session restore and the auth listener can both adopt at startup; share the work.
let adopting: { userId: string; promise: Promise<void> } | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      introSeen: false,
      ownerId: null,
      onboardingComplete: false,
      appSelection: null,
      schedule: null,
      gymLocation: null,
      streak: 0,
      longestStreak: 0,
      lastProofDate: null,
      lastProofAt: null,
      startedAt: null,
      checkIns: [],
      checkInRadiusMeters: 150,
      graceMinutes: 15,
      strictMode: true,

      setAppSelection: (summary) => set({ appSelection: summary }),

      setSchedule: (schedule) => {
        set({ schedule });
        void syncSchedule(schedule);
      },

      setGymLocation: (location) => set({ gymLocation: location }),

      setCheckInRadiusMeters: (meters) => set({ checkInRadiusMeters: meters }),

      setGraceMinutes: (minutes) => set({ graceMinutes: minutes }),

      setStrictMode: (enabled) => set({ strictMode: enabled }),

      markIntroSeen: () => set({ introSeen: true }),

      completeOnboarding: () =>
        set((state) => ({ onboardingComplete: true, startedAt: state.startedAt ?? toISODate(new Date()) })),

      submitProof: () => {
        const { schedule, gymLocation, lastProofDate, streak, longestStreak, checkIns } = get();
        const now = new Date();
        const today = toISODate(now);

        if (lastProofDate === today) return streak; // already proved today

        const continued = schedule ? !missedScheduledDaySince(schedule, lastProofDate, now) : true;
        const nextStreak = continued ? streak + 1 : 1;

        unlockNow();
        if (schedule) {
          updateShieldCopy({ schedule, gymName: gymLocation?.label ?? null, streak: nextStreak });
        }

        set({
          lastProofDate: today,
          lastProofAt: now.toISOString(),
          streak: nextStreak,
          longestStreak: Math.max(longestStreak, nextStreak),
          checkIns: [...checkIns, today],
        });
        void syncCheckIn(today, nextStreak);
        return nextStreak;
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

      resetProgress: () => set({ streak: 0, longestStreak: 0, lastProofDate: null, lastProofAt: null, checkIns: [] }),

      adoptAccount: (userId) => {
        if (adopting?.userId === userId) return adopting.promise;

        const promise = (async () => {
          // Saved progress loads asynchronously; deciding before it has would
          // mistake a returning user for a new one and overwrite their data.
          await persistedStateLoaded();
          const { ownerId, onboardingComplete } = get();
          if (ownerId === userId) return;
          const server = await fetchServerProgress(userId);

          // Set up before progress was tied to accounts: it belongs to this
          // account if the server knows it, otherwise it's someone else's.
          // Offline (no answer), keep it rather than wipe someone's streak.
          if (ownerId === null && onboardingComplete && (server === null || server.hasHistory)) {
            set({ ownerId: userId });
            return;
          }

          // Someone else's progress: stop locking their apps, then start this
          // account from its own history. Apps are picked per phone, so setup
          // runs again, with this account's schedule filled in.
          if (onboardingComplete) stopScreenTimeMonitoring();
          const days = server?.checkIns ?? [];
          const lastDay = days.length ? days[days.length - 1] : null;
          set({
            ...EMPTY_PROGRESS,
            ownerId: userId,
            schedule: server?.schedule ?? null,
            streak: server?.streak ?? 0,
            longestStreak: server?.streak ?? 0,
            checkIns: days,
            lastProofDate: lastDay,
            lastProofAt: server?.lastCheckedInAt ?? null,
            startedAt: days[0] ?? null,
          });
        })().finally(() => {
          adopting = null;
        });
        adopting = { userId, promise };
        return promise;
      },

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
          lastProofAt: null,
          startedAt: null,
          checkIns: [],
        });
      },
    }),
    {
      name: 'gymbuddy-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 had no start date: date it from the first check-in, or from now,
      // so the history grid doesn't paint every earlier gym day as missed.
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppState>;
        if (version < 1 && !state.startedAt) {
          const first = [...(state.checkIns ?? [])].sort()[0];
          state.startedAt = state.onboardingComplete ? (first ?? toISODate(new Date())) : null;
        }
        return state as AppState;
      },
    }
  )
);
