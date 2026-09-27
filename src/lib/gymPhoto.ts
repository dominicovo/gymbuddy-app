import GymVision, { type Classification } from '../../modules/gym-vision';
import { demoFlag } from '../dev/demoFlag';

// Is this check-in photo taken at a gym? Apple's on-device classifier labels
// the photo; we score the labels here so the rules stay easy to tune. Nothing
// is uploaded, the photo never leaves the phone.

export type PhotoVerdict =
  | { kind: 'gym'; score: number }
  | { kind: 'screen' } // a photo of a monitor, phone or screenshot
  | { kind: 'notGym'; score: number }
  | { kind: 'unavailable' }; // app binary without the classifier, or it failed

// Vision labels that only turn up in gyms (or places that count as one:
// climbing walls, boxing clubs, yoga studios). Calibrated against real gym
// photos: every one scored at least 0.48 on one of these, while beach, street,
// phone and portrait shots stayed at 0.16 or below.
const GYM_LABELS = new Set([
  'health_club',
  'workout',
  'barbell',
  'dumbbell',
  'treadmill',
  'sports_equipment',
  'gymnastics',
  'boxing',
  'kickboxing',
  'martial_arts',
  'wrestling',
  'yoga',
  'rock_climbing',
  'trampoline',
  'squash_sport',
]);

// A gym photo held up to the camera on another screen. Only counts when the
// screen outscores the gym: treadmill consoles and gym TVs are fine.
const SCREEN_LABELS = new Set(['screenshot', 'computer_monitor', 'television', 'laptop', 'consumer_electronics']);

export const GYM_THRESHOLD = 0.3;
const SCREEN_THRESHOLD = 0.6;

export function scorePhoto(labels: Classification[]): PhotoVerdict {
  const confidenceOf = (set: Set<string>) =>
    labels.reduce((best, l) => (set.has(l.identifier) ? Math.max(best, l.confidence) : best), 0);
  const gym = confidenceOf(GYM_LABELS);
  const screen = confidenceOf(SCREEN_LABELS);
  if (screen >= SCREEN_THRESHOLD && screen > gym) return { kind: 'screen' };
  return gym >= GYM_THRESHOLD ? { kind: 'gym', score: gym } : { kind: 'notGym', score: gym };
}

export async function checkGymPhoto(uri: string): Promise<PhotoVerdict> {
  // Screenshot sample data: the simulator can't run the classifier properly.
  if (__DEV__ && demoFlag.active) return { kind: 'gym', score: 0.94 };
  if (!GymVision) return { kind: 'unavailable' };
  try {
    return scorePhoto(await GymVision.classify(uri, 0.05));
  } catch (error) {
    console.warn('gym photo check failed', error);
    return { kind: 'unavailable' };
  }
}
