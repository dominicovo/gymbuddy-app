import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Buddy {
  id: string;
  name: string;
  initials: string;
  streak: number;
  checkedInAt: string | null; // e.g. "7:12 AM", or null if not in yet today
}

interface BuddiesState {
  buddies: Buddy[];
  addBuddy: (name: string) => Buddy;
  removeBuddy: (id: string) => void;
  updateBuddy: (id: string, patch: Partial<Omit<Buddy, 'id'>>) => void;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

// No backend for buddies yet — this seed data stands in until real
// pairing/sync is built, but add/remove/update now persist locally.
export const useBuddiesStore = create<BuddiesState>()(
  persist(
    (set, get) => ({
      buddies: [
        { id: 'marcus', name: 'Marcus Reyes', initials: 'MR', streak: 9, checkedInAt: '7:12 AM' },
        { id: 'priya', name: 'Priya Raman', initials: 'PR', streak: 14, checkedInAt: null },
        { id: 'kenji', name: 'Kenji Aoto', initials: 'KA', streak: 31, checkedInAt: '5:48 AM' },
      ],

      addBuddy: (name) => {
        const buddy: Buddy = {
          id: `${Date.now()}`,
          name,
          initials: initialsFor(name),
          streak: 0,
          checkedInAt: null,
        };
        set({ buddies: [...get().buddies, buddy] });
        return buddy;
      },

      removeBuddy: (id) => set((state) => ({ buddies: state.buddies.filter((b) => b.id !== id) })),

      updateBuddy: (id, patch) =>
        set((state) => ({
          buddies: state.buddies.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
    }),
    {
      name: 'gymbuddy-buddies-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
