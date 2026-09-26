// GymBuddy is dark-only. The palette is a violet-biased charcoal (so the
// neutrals read as chosen next to the brand purple, not as stock grey) plus
// three semantic state colours that the whole app speaks in:
//   accent  — locked / the brand
//   success — unlocked, checked in
//   warning — needs attention (window closing, buddy not in yet, missed day)
// gymbuddy.live uses these same values.
export const colors = {
  background: '#08070C',
  surface: '#121118',
  surfaceAlt: '#1B1A23',
  surfaceRaised: '#24222E',
  border: '#25232E',
  borderStrong: '#383545',
  text: '#F6F5FA',
  textMuted: '#A09DAE',
  textFaint: '#6E6B7B',
  textOnAccent: '#FFFFFF',
  accent: '#8B84F0',
  accentStrong: '#A79FFF',
  accentMuted: 'rgba(139, 132, 240, 0.16)',
  /** Outline for a card in the locked/brand state. */
  accentBorder: 'rgba(139, 132, 240, 0.45)',
  /** Background of a card that's in the locked/brand state. */
  accentSurface: '#141225',
  success: '#5FD08F',
  successMuted: 'rgba(95, 208, 143, 0.14)',
  successBorder: 'rgba(95, 208, 143, 0.35)',
  /** Background of a card that's in the unlocked/checked-in state. */
  successSurface: '#0C1711',
  warning: '#F0B35B',
  warningMuted: 'rgba(240, 179, 91, 0.14)',
  danger: '#E8776E',
  dangerMuted: 'rgba(232, 119, 110, 0.12)',
};

// 8pt grid (Apple HIG convention).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

// Numbers are the one place GymBuddy has its own voice: countdowns, streaks,
// stats and pair codes are set in a condensed athletic face, like a gym clock
// or a scoreboard. Everything else stays on the system font (SF Pro) at HIG
// sizes, so text reads native-sized next to every other app on the phone.
export const fonts = {
  numeric: 'BarlowCondensed_700Bold',
  numericHeavy: 'BarlowCondensed_800ExtraBold',
  numericMedium: 'BarlowCondensed_600SemiBold',
};

export const type = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: 0.2 }, // Large Title
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.1 }, // Title 2
  subtitle: { fontSize: 17, fontWeight: '600' as const }, // Headline
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 23 }, // Body
  label: { fontSize: 15, fontWeight: '600' as const }, // Subheadline
  caption: { fontSize: 13, fontWeight: '500' as const }, // Footnote
  eyebrow: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.8 },
  // Condensed numerals — see `fonts` above.
  numeralXL: { fontFamily: fonts.numericHeavy, fontSize: 76, lineHeight: 78, letterSpacing: 0.5 },
  numeralL: { fontFamily: fonts.numeric, fontSize: 40, lineHeight: 44 },
  numeralM: { fontFamily: fonts.numeric, fontSize: 28, lineHeight: 32 },
  numeralS: { fontFamily: fonts.numeric, fontSize: 20, lineHeight: 24 },
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 4,
  },
};
