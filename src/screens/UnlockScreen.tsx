import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../components/Button';
import { LockStatusCard } from '../components/LockStatusCard';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { TabScreenProps } from '../navigation/types';
import { formatHHMM } from '../lib/time';
import { getThisWeek, weekSummary } from '../lib/weekTracker';
import { getCurrentLocation } from '../lib/location';
import { distanceInMeters } from '../lib/geo';

type Props = TabScreenProps<'Unlock'>;

const METERS_PER_MILE = 1609.344;

function formatDateHeader(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday.toUpperCase()} ${day} ${month.toUpperCase()}`;
}

export function UnlockScreen({ navigation }: Props) {
  const schedule = useAppStore((s) => s.schedule);
  const gymLocation = useAppStore((s) => s.gymLocation);
  const appSelection = useAppStore((s) => s.appSelection);
  const streak = useAppStore((s) => s.streak);
  const checkIns = useAppStore((s) => s.checkIns);
  const getLockState = useAppStore((s) => s.getLockState);

  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      if (gymLocation) {
        getCurrentLocation()
          .then((here) => {
            if (!cancelled && here) {
              setDistanceMiles(distanceInMeters(here, gymLocation) / METERS_PER_MILE);
            }
          })
          .catch(() => {});
      }
      return () => {
        cancelled = true;
      };
    }, [gymLocation])
  );

  const lockState = getLockState();
  const appCount = (appSelection?.applicationCount ?? 0) + (appSelection?.categoryCount ?? 0);
  const week = getThisWeek(schedule, checkIns, new Date());
  const summary = weekSummary(week);

  // No 'bottom' edge: the tab bar already sits in the bottom safe area, so
  // insetting here as well leaves a dead band under the CTA.
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.dateLabel}>{formatDateHeader(new Date())}</Text>
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={14} color={colors.accent} />
            <Text style={styles.streakPillText}>{streak} days</Text>
          </View>
        </View>
        <Text style={styles.brand}>Unlock</Text>

        <View style={styles.heroWrap}>
          <LockStatusCard variant="full" />

          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Ionicons name="apps-outline" size={13} color={colors.text} />
              <Text style={styles.pillText}>{appCount > 0 ? `${appCount} selected` : 'No apps'}</Text>
            </View>
            {distanceMiles !== null && (
              <View style={styles.pill}>
                <Ionicons name="location-outline" size={13} color={colors.text} />
                <Text style={styles.pillText}>{distanceMiles.toFixed(1)} mi away</Text>
              </View>
            )}
            {schedule && (
              <View style={styles.pill}>
                <Ionicons name="time-outline" size={13} color={colors.text} />
                <Text style={styles.pillText}>
                  {formatHHMM(schedule.windowStart)} – {formatHHMM(schedule.windowEnd)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekTitle}>This week</Text>
            <Text style={styles.weekSummary}>
              {summary.done} of {summary.total} done
            </Text>
          </View>
          <View style={styles.weekRow}>
            {week.map((d) => (
              <View key={d.date} style={styles.weekDayWrap}>
                <Text style={[styles.weekDayLabel, d.isToday && styles.weekDayLabelToday]}>{d.day[0]}</Text>
                <View
                  style={[
                    styles.weekDayCell,
                    d.scheduled && styles.weekDayScheduled,
                    d.done && styles.weekDayDone,
                    d.isToday && !d.done && styles.weekDayToday,
                  ]}
                >
                  {d.done ? (
                    <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
                  ) : d.isToday ? (
                    <Ionicons name="ellipse-outline" size={12} color={colors.accent} />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="I'm at the Gym"
          icon="camera"
          disabled={lockState !== 'locked'}
          onPress={() => navigation.navigate('Proof')}
        />
        <Text style={styles.footerCaption}>Photo plus location unlocks everything for today.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  streakPillText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  brand: { color: colors.text, ...type.display },
  heroWrap: { marginTop: spacing.lg },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  pillText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  weekCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  weekTitle: { color: colors.text, ...type.subtitle },
  weekSummary: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayWrap: { alignItems: 'center', gap: spacing.xs },
  weekDayLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  weekDayLabelToday: { color: colors.accent },
  weekDayCell: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayScheduled: { backgroundColor: colors.accentMuted },
  weekDayDone: { backgroundColor: colors.accent },
  weekDayToday: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerCaption: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
});
