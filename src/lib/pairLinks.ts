import { create } from 'zustand';

/**
 * Pair links: https://www.gymbuddy.live/b/1234 (universal link, shared by the
 * app) and gymbuddy://b/1234 (the custom scheme the website's "Open GymBuddy"
 * button uses). Both carry a buddy's 4-digit pair code.
 */
export const PAIR_LINK_HOST = 'https://www.gymbuddy.live';

export function pairLink(code: string): string {
  return `${PAIR_LINK_HOST}/b/${code}`;
}

const PAIR_LINK = /^(?:gymbuddy:\/\/|https?:\/\/(?:www\.)?gymbuddy\.live\/)b\/(\d{4})(?:[/?#]|$)/i;

export function parsePairCode(url: string | null | undefined): string | null {
  if (!url) return null;
  return PAIR_LINK.exec(url)?.[1] ?? null;
}

interface PairLinkState {
  /** A code from a link that arrived before the app could act on it (signed out, mid-onboarding). */
  pendingCode: string | null;
  setPending: (code: string | null) => void;
}

export const usePairLinkStore = create<PairLinkState>()((set) => ({
  pendingCode: null,
  setPending: (code) => set({ pendingCode: code }),
}));
