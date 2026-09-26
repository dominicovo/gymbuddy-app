// Turns raw Supabase / provider errors into something a person can act on.
// In development the raw message and the likely config fix are appended, since
// most sign-in failures while building are dashboard settings, not code.

interface Hint {
  test: RegExp;
  user: string;
  dev: string;
}

const HINTS: Hint[] = [
  {
    test: /network request failed|failed to fetch|could not resolve|timed out|load failed/i,
    user: "Can't reach GymBuddy right now. Check your connection and try again.",
    dev: 'Supabase is unreachable. If the project URL no longer resolves, the free-tier project is paused — restore it in the Supabase dashboard.',
  },
  {
    test: /provider.*(not enabled|disabled)|unsupported provider/i,
    user: 'This sign-in option is temporarily unavailable.',
    dev: 'Enable this provider in Supabase → Authentication → Sign In / Providers.',
  },
  {
    test: /unacceptable audience|audience/i,
    user: 'This sign-in option is temporarily unavailable.',
    dev: 'Token audience rejected. Google: put the Web client ID then the iOS client ID in the provider’s Client IDs. Apple: add the bundle ID com.dominiceburuoh.gymbuddy to Client IDs.',
  },
  {
    test: /nonce/i,
    user: 'Sign-in could not be verified. Please try again.',
    dev: 'Turn on "Skip nonce check" in the Supabase Google provider — the iOS Google SDK adds its own nonce.',
  },
  {
    test: /signups? not allowed|signup.*disabled/i,
    user: 'New accounts are paused right now. Please try again later.',
    dev: 'Supabase → Authentication → Sign In / Providers → "Allow new users to sign up" is off.',
  },
];

export function describeAuthError(error: unknown, fallback = 'Sign-in failed. Please try again.'): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const hint = HINTS.find((h) => h.test.test(raw));
  const user = hint?.user ?? fallback;
  if (!__DEV__) return user;
  return [user, hint?.dev, raw && `(${raw})`].filter(Boolean).join('\n\n');
}
