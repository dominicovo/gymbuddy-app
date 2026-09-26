import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, radius, spacing, type } from '../../theme/colors';
import { IoniconName } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Intro'>;

// First-launch tour, before sign-in: what GymBuddy does, what it asks of you,
// and the rules that keep it fair. Each page is illustrated with the piece of
// the app it describes.

function LockVisual() {
  const apps: { icon: IoniconName; tint: string }[] = [
    { icon: 'logo-instagram', tint: '#E07BB5' },
    { icon: 'logo-tiktok', tint: '#F6F5FA' },
    { icon: 'game-controller', tint: '#6AA8F0' },
    { icon: 'logo-youtube', tint: '#E8776E' },
    { icon: 'logo-twitter', tint: '#4FC3B5' },
    { icon: 'chatbubbles', tint: '#9CCB5E' },
  ];
  return (
    <View style={v.card}>
      <View style={v.tiles}>
        {apps.map((a) => (
          <View key={a.icon} style={v.tile}>
            <Ionicons name={a.icon} size={26} color={a.tint} />
            <View style={v.tileLock}>
              <Ionicons name="lock-closed" size={10} color={colors.textOnAccent} />
            </View>
          </View>
        ))}
      </View>
      <View style={v.pill}>
        <Ionicons name="calendar" size={14} color={colors.accent} />
        <Text style={v.pillText}>Mon · Wed · Fri  ·  6:00 AM – 8:00 PM</Text>
      </View>
    </View>
  );
}

function ProofVisual() {
  return (
    <View style={v.card}>
      <View style={[v.row, v.rowOk]}>
        <View style={[v.rowIcon, { backgroundColor: colors.successMuted }]}>
          <Ionicons name="camera" size={20} color={colors.success} />
        </View>
        <View style={v.rowText}>
          <Text style={[v.rowTitle, { color: colors.success }]}>Gym photo taken</Text>
          <Text style={v.rowSub}>Today · 6:42 AM</Text>
        </View>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
      </View>
      <View style={v.row}>
        <View style={[v.rowIcon, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name="phone-portrait" size={20} color={colors.accent} />
        </View>
        <View style={v.rowText}>
          <Text style={v.rowTitle}>Stays on your phone</Text>
          <Text style={v.rowSub}>Never uploaded or shared</Text>
        </View>
      </View>
      <View style={v.unlocked}>
        <Ionicons name="lock-open" size={18} color={colors.textOnAccent} />
        <Text style={v.unlockedText}>Apps unlocked for today</Text>
      </View>
    </View>
  );
}

function StreakVisual() {
  const buddies = [
    { initials: 'MC', name: 'Maya', status: 'In at 6:42 AM', tint: '#4FC3B5', dot: colors.success },
    { initials: 'JO', name: 'Jordan', status: 'Not in yet', tint: '#E8B25A', dot: colors.warning },
  ];
  return (
    <View style={v.card}>
      <View style={v.streakRow}>
        <Ionicons name="flame" size={30} color={colors.warning} style={v.streakFlame} />
        <Text style={v.streakDay}>DAY</Text>
        <Text style={v.streakNum}>9</Text>
      </View>
      {buddies.map((b) => (
        <View key={b.name} style={v.row}>
          <View style={[v.avatar, { backgroundColor: `${b.tint}33` }]}>
            <Text style={[v.avatarText, { color: b.tint }]}>{b.initials}</Text>
            <View style={[v.avatarDot, { backgroundColor: b.dot }]} />
          </View>
          <View style={v.rowText}>
            <Text style={v.rowTitle}>{b.name}</Text>
            <Text style={v.rowSub}>{b.status}</Text>
          </View>
          <View style={[v.miniAction, { backgroundColor: b.dot === colors.success ? colors.successMuted : colors.warningMuted }]}>
            <Ionicons name={b.dot === colors.success ? 'hand-left' : 'megaphone'} size={14} color={b.dot} />
          </View>
        </View>
      ))}
    </View>
  );
}

function RulesVisual() {
  const rules: { icon: IoniconName; text: string }[] = [
    { icon: 'moon', text: 'Rest days never lock' },
    { icon: 'time', text: 'Apps unlock when your window ends — even if you skip' },
    { icon: 'shield-checkmark', text: 'Apple keeps your app list private, even from us' },
    { icon: 'camera', text: 'Your check-in photo never leaves your phone' },
  ];
  return (
    <View style={v.card}>
      {rules.map((r) => (
        <View key={r.text} style={v.rule}>
          <View style={[v.rowIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name={r.icon} size={18} color={colors.accent} />
          </View>
          <Text style={v.ruleText}>{r.text}</Text>
        </View>
      ))}
    </View>
  );
}

const PAGES = [
  {
    key: 'lock',
    eyebrow: 'HOW IT WORKS',
    title: 'Lock the apps that pull you in',
    body: 'Pick the apps and your gym days. When your window opens, they lock — no snooze button.',
    Visual: LockVisual,
  },
  {
    key: 'proof',
    eyebrow: 'SHOW UP',
    title: 'Get to the gym to unlock',
    body: 'Snap a photo when you get to the gym. Your apps open for the rest of the day.',
    Visual: ProofVisual,
  },
  {
    key: 'streak',
    eyebrow: 'KEEP GOING',
    title: 'Build a streak, with backup',
    body: 'Every gym day you make it counts. Pair with buddies who see if you showed up — and cheer when you do.',
    Visual: StreakVisual,
  },
  {
    key: 'rules',
    eyebrow: 'FAIR RULES',
    title: 'Strict, never stuck',
    body: 'GymBuddy holds you to your plan without trapping you in it.',
    Visual: RulesVisual,
  },
];

export function IntroScreen({ navigation }: Props) {
  const markIntroSeen = useAppStore((s) => s.markIntroSeen);
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof PAGES)[number]>>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  function finish() {
    markIntroSeen();
    navigation.reset({ index: 0, routes: [{ name: 'AuthEntry' }] });
  }

  function next() {
    if (last) return finish();
    listRef.current?.scrollToIndex({ index: page + 1, animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page) setPage(i);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Image
          source={require('../../../assets/brand/gymbuddy-wordmark.png')}
          style={styles.wordmark}
          resizeMode="contain"
          accessibilityLabel="GymBuddy"
        />
        {!last && (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip the tour">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <View style={styles.visualWrap}>
              <item.Visual />
            </View>
            <Text style={styles.eyebrow}>{item.eyebrow}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <View key={p.key} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Button title={last ? 'Get started' : 'Next'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 44,
  },
  // The wordmark cut-out is 1464×167; keep its aspect ratio.
  wordmark: { width: 132, height: 132 * (167 / 1464) },
  skip: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  page: { paddingHorizontal: spacing.lg, justifyContent: 'center' },
  visualWrap: { marginBottom: spacing.xl },
  eyebrow: { color: colors.accent, ...type.eyebrow, fontSize: 12 },
  title: { color: colors.text, ...type.display, fontSize: 32, lineHeight: 37, marginTop: spacing.sm },
  body: { color: colors.textMuted, ...type.body, marginTop: spacing.sm + 2 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfaceRaised },
  dotActive: { width: 22, backgroundColor: colors.accent },
});

// Illustration styles — the app's own components, simplified.
const v = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm + 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, justifyContent: 'space-between' },
  tile: {
    width: '30.5%',
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLock: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: spacing.xs,
  },
  pillText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.sm + 4,
  },
  rowOk: { backgroundColor: colors.successSurface },
  rowIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  unlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  unlockedText: { color: colors.textOnAccent, fontSize: 16, fontWeight: '700' },
  streakRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  // Lifted so the flame, DAY and the numeral share a baseline.
  streakFlame: { marginBottom: 12 },
  streakDay: { color: colors.textMuted, fontFamily: type.numeralM.fontFamily, fontSize: 26, marginBottom: 8 },
  streakNum: { color: colors.text, ...type.numeralXL, fontSize: 84, lineHeight: 86 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  avatarDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
  },
  miniAction: { width: 34, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: 4 },
  ruleText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
});
