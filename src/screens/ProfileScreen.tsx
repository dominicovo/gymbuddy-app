import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ConsistencyGrid } from '../components/ConsistencyGrid';
import { IconButton } from '../components/IconButton';
import { LargeHeader, ListGroup, ListRow, SectionHeader } from '../components/ListGroup';
import { StatTile } from '../components/StatTile';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, TabScreenProps } from '../navigation/types';
import { formatDays } from '../lib/schedule';
import { formatHHMM } from '../lib/time';
import { historyGrid, historyStats, liveStreak } from '../lib/stats';
import { LOCATION_CHECK_IN } from '../config/features';

type Props = TabScreenProps<'Profile'>;

function formatMemberSince(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ProfileScreen({ navigation }: Props) {
  const fullName = useAuthStore((s) => s.fullName);
  const handle = useAuthStore((s) => s.handle);
  const pairCode = useAuthStore((s) => s.pairCode);
  const memberSince = useAuthStore((s) => s.memberSince);
  const avatarUrl = useAuthStore((s) => s.avatarUrl);

  const schedule = useAppStore((s) => s.schedule);
  const gymLocation = useAppStore((s) => s.gymLocation);
  const streak = useAppStore((s) => s.streak);
  const longestStreak = useAppStore((s) => s.longestStreak);
  const lastProofDate = useAppStore((s) => s.lastProofDate);
  const checkIns = useAppStore((s) => s.checkIns);
  const startedAt = useAppStore((s) => s.startedAt);
  const restartOnboarding = useAppStore((s) => s.restartOnboarding);

  const now = new Date();
  const current = liveStreak(schedule, streak, lastProofDate, now);
  const stats = historyStats(schedule, checkIns, startedAt, now);
  const grid = historyGrid(schedule, checkIns, startedAt, now);
  const since = formatMemberSince(memberSince);

  function confirmStartOver() {
    Alert.alert(
      'Start over?',
      'This clears your schedule, locked apps, streaks and history on this phone, and takes you back through setup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: () => {
            restartOnboarding();
            navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({
              index: 0,
              routes: [{ name: 'OnboardingApps' }],
            });
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LargeHeader
          title="Profile"
          right={<IconButton icon="settings-outline" onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings" />}
        />

        <View style={styles.identity}>
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityRole="button"
            accessibilityLabel={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
          >
            <Avatar name={fullName || '?'} seed={handle} uri={avatarUrl} size={72} />
          </Pressable>
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName || 'Your name'}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>
              @{handle || 'handle'}
              {since ? ` · since ${since}` : ''}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatTile label="Streak" icon="flame" value={String(current)} unit={current === 1 ? 'day' : 'days'} color={current > 0 ? colors.warning : colors.text} />
            <StatTile label="Best" icon="trophy" value={String(Math.max(longestStreak, current))} unit="days" />
          </View>
          <View style={styles.statsRow}>
            <StatTile label="This month" icon="barbell" value={String(stats.thisMonth)} unit={`of ${stats.total} total`} />
            <StatTile
              label="Attendance"
              icon="pulse"
              value={stats.attendance === null ? '—' : String(stats.attendance)}
              unit={stats.attendance === null ? undefined : '% · 4 wks'}
              color={stats.attendance !== null && stats.attendance >= 80 ? colors.success : colors.text}
            />
          </View>
        </View>

        <SectionHeader title="Last 12 weeks" />
        <ConsistencyGrid columns={grid} />

        <SectionHeader title="Your plan" action="Edit" onAction={() => navigation.navigate('Settings')} />
        <ListGroup>
          <ListRow icon="calendar" title="Gym days" value={schedule ? formatDays(schedule.days) : 'Not set'} />
          <ListRow
            icon="time"
            title="Lock window"
            value={schedule ? `${formatHHMM(schedule.windowStart)} – ${formatHHMM(schedule.windowEnd)}` : 'Not set'}
          />
          {LOCATION_CHECK_IN && <ListRow icon="location" title="Home gym" value={gymLocation?.label ?? 'Not set'} />}
        </ListGroup>

        <SectionHeader title="Buddies" />
        <ListGroup>
          <ListRow
            icon="qr-code"
            title="Your pair code"
            trailing={<Text style={styles.code}>{pairCode || '—'}</Text>}
            onPress={() => navigation.navigate('SharePairCard')}
          />
        </ListGroup>

        <ListGroup style={styles.dangerGroup}>
          <ListRow icon="refresh" title="Start over" destructive onPress={confirmStartOver} showChevron={false} />
        </ListGroup>

        <Text style={styles.about}>GymBuddy 1.0.0 · gymbuddy.live</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md + 4, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  identityText: { flex: 1 },
  name: { color: colors.text, ...type.title, fontSize: 22 },
  handle: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
  editButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  statsGrid: { gap: spacing.sm, marginTop: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  code: { color: colors.text, ...type.numeralS, fontSize: 24, letterSpacing: 3 },
  dangerGroup: { marginTop: spacing.lg },
  about: { color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xl },
});
