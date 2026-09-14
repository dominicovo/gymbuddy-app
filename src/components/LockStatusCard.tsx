import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius, shadow, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { IoniconName, LockState } from '../types';
import { formatHHMM, stepHHMM } from '../lib/time';
import { windowProgress } from '../lib/schedule';

const LOCK_COPY: Record<LockState, { title: string; subtitle: string; icon: IoniconName }> = {
  locked: {
    title: 'Apps Locked',
    subtitle: "It's go time. Show up and submit proof to unlock.",
    icon: 'lock-closed',
  },
  unlocked: {
    title: 'Apps Unlocked',
    subtitle: 'Proof submitted. Enjoy your scroll — you earned it.',
    icon: 'lock-open',
  },
  inactive: {
    title: 'No Active Lock',
    subtitle: "You're outside today's lock window.",
    icon: 'pause-circle-outline',
  },
};

const RING_SIZE = 176;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

interface LockStatusCardProps {
  /** 'full' (Unlock tab): big hero with a countdown ring. 'compact' (Profile/Settings): smaller, "{days} · {window}" meta line. */
  variant?: 'full' | 'compact';
  /** Compact only: show the streak count as a trailing badge (Settings does, Profile doesn't). */
  showStreak?: boolean;
}

export function LockStatusCard({ variant = 'full', showStreak = false }: LockStatusCardProps) {
  const schedule = useAppStore((s) => s.schedule);
  const streak = useAppStore((s) => s.streak);
  const graceMinutes = useAppStore((s) => s.graceMinutes);
  const getLockState = useAppStore((s) => s.getLockState);

  const [lockState, setLockState] = useState(getLockState());
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    React.useCallback(() => {
      setLockState(getLockState());
      setNow(new Date());
      const interval = setInterval(() => {
        setLockState(getLockState());
        setNow(new Date());
      }, 30000);
      return () => clearInterval(interval);
    }, [getLockState])
  );

  useEffect(() => {
    setLockState(getLockState());
  }, [streak, getLockState]);

  const copy = LOCK_COPY[lockState];
  const locked = lockState === 'locked';
  const meta = schedule
    ? `${schedule.days.join(' · ')} · ${formatHHMM(schedule.windowStart)}–${formatHHMM(schedule.windowEnd)}`
    : 'No schedule set';

  if (variant === 'compact') {
    return (
      <View style={[styles.compactCard, locked && styles.cardLocked]}>
        <Ionicons name={copy.icon} size={22} color={locked ? colors.accent : colors.textMuted} style={styles.compactIcon} />
        <View style={styles.compactTextWrap}>
          <Text style={styles.compactTitle}>{copy.title}</Text>
          <Text style={styles.compactMeta}>{meta}</Text>
        </View>
        {showStreak && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color={colors.accent} />
            <Text style={styles.streakBadgeText}>{streak}</Text>
          </View>
        )}
      </View>
    );
  }

  const effectiveSchedule =
    schedule && graceMinutes ? { ...schedule, windowStart: stepHHMM(schedule.windowStart, graceMinutes) } : schedule;
  const progress = locked && effectiveSchedule ? windowProgress(effectiveSchedule, now) : null;
  const dashOffset = progress ? RING_CIRCUMFERENCE * (1 - progress.elapsedRatio) : RING_CIRCUMFERENCE;

  return (
    <View style={[styles.fullCard, locked && styles.cardLocked]}>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          {progress && (
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.accent}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              fill="none"
              rotation="-90"
              originX={RING_SIZE / 2}
              originY={RING_SIZE / 2}
            />
          )}
        </Svg>
        <View style={styles.ringCenter}>
          <Ionicons name={copy.icon} size={28} color={locked ? colors.accent : colors.textMuted} />
          {progress ? (
            <>
              <Text style={styles.countdown}>{formatCountdown(progress.remainingMinutes)}</Text>
              <Text style={styles.countdownLabel}>LEFT TO UNLOCK</Text>
            </>
          ) : null}
        </View>
      </View>
      <Text style={styles.fullTitle}>{copy.title}</Text>
      <Text style={styles.fullSubtitle}>{copy.subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  cardLocked: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ringSvg: { position: 'absolute' },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  countdown: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: spacing.xs },
  countdownLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  fullTitle: { color: colors.text, ...type.title },
  fullSubtitle: {
    color: colors.textMuted,
    ...type.body,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  compactIcon: { marginRight: spacing.md },
  compactTextWrap: { flex: 1 },
  compactTitle: { color: colors.text, ...type.subtitle },
  compactMeta: { color: colors.textMuted, ...type.caption, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakBadgeText: { color: colors.text, fontSize: 17, fontWeight: '800' },
});
