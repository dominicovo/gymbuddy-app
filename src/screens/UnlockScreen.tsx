import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TodayHero } from '../components/TodayHero';
import { WeekStrip } from '../components/WeekStrip';
import { LargeHeader, ListGroup, ListRow, SectionHeader } from '../components/ListGroup';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { TabScreenProps } from '../navigation/types';
import { getThisWeek } from '../lib/weekTracker';
import { getCurrentLocation } from '../lib/location';
import { distanceInMeters } from '../lib/geo';
import { liveStreak } from '../lib/stats';
import { LOCATION_CHECK_IN } from '../config/features';

type Props = TabScreenProps<'Unlock'>;

const METERS_PER_MILE = 1609.344;

function formatDateEyebrow(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday} ${date.getDate()} ${month}`.toUpperCase();
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / METERS_PER_MILE).toFixed(1)} mi away`;
}

export function UnlockScreen({ navigation }: Props) {
  const schedule = useAppStore((s) => s.schedule);
  const gymLocation = useAppStore((s) => s.gymLocation);
  const appSelection = useAppStore((s) => s.appSelection);
  const streak = useAppStore((s) => s.streak);
  const lastProofDate = useAppStore((s) => s.lastProofDate);
  const checkIns = useAppStore((s) => s.checkIns);
  const startedAt = useAppStore((s) => s.startedAt);
  const radiusMeters = useAppStore((s) => s.checkInRadiusMeters);

  const [distance, setDistance] = useState<number | null>(null);
  const [locationUnavailable, setLocationUnavailable] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      if (LOCATION_CHECK_IN && gymLocation) {
        getCurrentLocation()
          .then((here) => {
            if (cancelled) return;
            setLocationUnavailable(!here);
            if (here) setDistance(distanceInMeters(here, gymLocation));
          })
          .catch(() => {
            if (!cancelled) setLocationUnavailable(true);
          });
      }
      return () => {
        cancelled = true;
      };
    }, [gymLocation])
  );

  const now = new Date();
  const currentStreak = liveStreak(schedule, streak, lastProofDate, now);
  const week = getThisWeek(schedule, checkIns, now);
  const appCount = (appSelection?.applicationCount ?? 0) + (appSelection?.categoryCount ?? 0);
  const inRange = distance !== null && distance <= radiusMeters;

  const gymSubtitle = !gymLocation
    ? 'Needed to check in'
    : distance === null
      ? locationUnavailable
        ? 'Location off \u00b7 needed to check in'
        : 'Locating you\u2026'
      : inRange
        ? `You’re here · ${Math.round(distance)} m`
        : formatDistance(distance);

  // No 'bottom' edge: the tab bar already sits in the bottom safe area.
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LargeHeader
          eyebrow={formatDateEyebrow(now)}
          title="Today"
          right={
            <View
              style={[styles.streak, currentStreak > 0 && styles.streakActive]}
              accessible
              accessibilityLabel={`${currentStreak} day streak`}
            >
              <Ionicons name="flame" size={16} color={currentStreak > 0 ? colors.warning : colors.textFaint} />
              <Text style={[styles.streakValue, currentStreak === 0 && { color: colors.textMuted }]}>{currentStreak}</Text>
            </View>
          }
        />

        <View style={styles.hero}>
          <TodayHero
            onCheckIn={() => navigation.navigate('Proof')}
            onSetup={() => navigation.navigate('Settings')}
          />
        </View>

        <SectionHeader title="Your setup" />
        <ListGroup>
          {LOCATION_CHECK_IN && (
            <ListRow
              icon={inRange ? 'location' : 'location-outline'}
              tone={inRange ? 'success' : gymLocation ? 'accent' : 'warning'}
              title={gymLocation?.label ?? 'No gym set'}
              subtitle={gymSubtitle}
              onPress={() => navigation.navigate('Settings')}
            />
          )}
          <ListRow
            icon="apps"
            title={appCount > 0 ? `${appCount} app${appCount === 1 ? '' : 's'} & categories` : 'No apps picked'}
            subtitle="Locked during your window"
            tone={appCount > 0 ? 'accent' : 'warning'}
            onPress={() => navigation.navigate('Settings')}
          />
        </ListGroup>

        <View style={styles.week}>
          <WeekStrip days={week} startedAt={startedAt} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md + 4, paddingTop: spacing.md, paddingBottom: spacing.xl },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 4,
  },
  streakActive: { backgroundColor: colors.warningMuted },
  streakValue: { color: colors.text, ...type.numeralS, fontSize: 22, lineHeight: 26 },
  hero: { marginTop: spacing.md },
  week: { marginTop: spacing.lg },
});
