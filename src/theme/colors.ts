export const colors = {
  background: '#121118',
  surface: '#1C1B24',
  surfaceAlt: '#26242F',
  border: '#33313D',
  borderStrong: '#44414F',
  text: '#F5F4F8',
  textMuted: '#9C99A8',
  textOnAccent: '#FFFFFF',
  accent: '#8B84F0',
  accentMuted: 'rgba(139, 132, 240, 0.18)',
  accentStrong: '#A79FFF',
  success: '#6FBF86',
  danger: '#E17B73',
};

// Spacing follows an 8pt grid (Apple HIG convention) — tightened at the top
// end so cards and sections don't read as emptier than their content needs.
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
  xl: 20,
  pill: 999,
};

// Type scale follows Apple's Human Interface Guidelines (SF Pro / Dynamic
// Type) sizes, rather than an arbitrary custom scale — it's the standard
// every other iOS app on the device is already set to, so GymBuddy reads as
// native-sized instead of undersized next to them.
export const type = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: 0.4 }, // Large Title
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.1 }, // Title 2
  subtitle: { fontSize: 17, fontWeight: '600' as const }, // Headline
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 23 }, // Body
  label: { fontSize: 15, fontWeight: '600' as const }, // Subheadline
  caption: { fontSize: 13, fontWeight: '500' as const }, // Footnote
  eyebrow: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.8 },
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
};
