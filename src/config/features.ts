/**
 * Product switches. Flip one and the app adapts everywhere it matters.
 */

/**
 * Check-ins also verify the user is within the check-in radius of their gym.
 * Off for now: a check-in is a gym photo only. While off, the app skips the
 * gym-location setup step, doesn't ask for location permission, and hides the
 * gym and radius settings. The gym search, distance check and stored gym all
 * stay in place, ready to switch back on.
 */
export const LOCATION_CHECK_IN = false;

/** Steps in first-time setup: apps → schedule (→ gym, when location check-ins are on). */
export const SETUP_STEPS = LOCATION_CHECK_IN ? 3 : 2;
