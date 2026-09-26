import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from './Button';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { IoniconName } from '../types';
import { formatHHMM, stepHHMM } from '../lib/time';
import { isScheduledDay, nextLockAt, toISODate, windowClosesAt, windowEndedToday } from '../lib/schedule';

type Phase =
  | { kind: 'setup' }
  | { kind: 'locked'; closesAt: Date; ratio: number }
  | { kind: 'done'; at: Date | null }
  | { kind: 'upcoming'; locksAt: Date; inGrace: boolean }
  | { kind: 'missed'; closedAt: string }
  | { kind: 'rest'; next: Date | null };

const TICK_MS = 15000;

function clock(date: Date): { time: string; period: string } {
  const h24 = date.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { time: `${h12}:${String(date.getMinutes()).padStart(2, '0')}`, period: h24 >= 12 ? 'PM' : 'AM' };
}

/** "1:42" for 1h 42m. Minutes are rounded up so it never reads 0:00 while time remains. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 60000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function weekdayName(date: Date, now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (toISODate(date) === toISODate(tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

interface TodayHeroProps {
  onCheckIn: () => void;
  onSetup: () => void;
}

export function TodayHero({ onCheckIn, onSetup }: TodayHeroProps) {
  const schedule = useAppStore((s) => s.schedule);
  const graceMinutes = useAppStore((s) => s.graceMinutes);
  const lastProofDate = useAppStore((s) => s.lastProofDate);
  const lastProofAt = useAppStore((s) => s.lastProofAt);
  const getLockState = useAppStore((s) => s.getLockState);
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    React.useCallback(() => {
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), TICK_MS);
      return () => clearInterval(id);
    }, [])
  );

  const phase = computePhase();

  function computePhase(): Phase {
    if (!schedule) return { kind: 'setup' };
    const lock = getLockState();
    if (lock === 'unlocked') return { kind: 'done', at: lastProofAt ? new Date(lastProofAt) : null };
    if (lock === 'locked') {
      const closesAt = windowClosesAt(schedule, now);
      const lockedAt = new Date(closesAt);
      const [sh, sm] = stepHHMM(schedule.windowStart, graceMinutes).split(':').map(Number);
      lockedAt.setHours(sh, sm, 0, 0);
      if (lockedAt > closesAt) lockedAt.setDate(lockedAt.getDate() - 1);
      const span = closesAt.getTime() - lockedAt.getTime();
      const ratio = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - lockedAt.getTime()) / span)) : 0;
      return { kind: 'locked', closesAt, ratio };
    }
    if (windowEndedToday(schedule, now) && lastProofDate !== toISODate(now)) {
      return { kind: 'missed', closedAt: formatHHMM(schedule.windowEnd) };
    }
    const next = nextLockAt(schedule, graceMinutes, now, lastProofDate === toISODate(now));
    if (next && toISODate(next) === toISODate(now) && isScheduledDay(schedule, now)) {
      const [wh, wm] = schedule.windowStart.split(':').map(Number);
      const windowOpen = now.getHours() * 60 + now.getMinutes() >= wh * 60 + wm;
      return { kind: 'upcoming', locksAt: next, inGrace: windowOpen };
    }
    return { kind: 'rest', next };
  }

  const windowLabel = schedule ? `${formatHHMM(schedule.windowStart)} – ${formatHHMM(schedule.windowEnd)}` : null;

  let tone = colors.textMuted;
  let chipIcon: IoniconName = 'moon';
  let chipLabel = '';
  let big: React.ReactNode = null;
  let caption = '';
  let message = '';

  switch (phase.kind) {
    case 'setup':
      tone = colors.accent;
      chipIcon = 'construct';
      chipLabel = 'Not set up';
      message = 'Pick your gym days and lock window to start.';
      break;
    case 'locked': {
      tone = colors.accent;
      chipIcon = 'lock-closed';
      chipLabel = 'Apps locked';
      big = <Text style={[styles.numeral, { color: colors.text }]}>{countdown(phase.closesAt.getTime() - now.getTime())}</Text>;
      caption = 'left in today’s window';
      message = 'Get to the gym and check in to unlock everything.';
      break;
    }
    case 'done': {
      tone = colors.success;
      chipIcon = 'lock-open';
      chipLabel = 'Unlocked';
      if (phase.at) {
        const c = clock(phase.at);
        big = (
          <View style={styles.numeralRow}>
            <Text style={[styles.numeral, { color: colors.text }]}>{c.time}</Text>
            <Text style={styles.period}>{c.period}</Text>
          </View>
        );
        caption = 'checked in';
      }
      message = 'Proof is in. Your apps are open for the rest of today.';
      break;
    }
    case 'upcoming': {
      tone = colors.warning;
      chipIcon = phase.inGrace ? 'hourglass' : 'time';
      chipLabel = phase.inGrace ? 'Grace period' : 'Locks later';
      big = <Text style={[styles.numeral, { color: colors.text }]}>{countdown(phase.locksAt.getTime() - now.getTime())}</Text>;
      const c = clock(phase.locksAt);
      caption = `until apps lock at ${c.time} ${c.period}`;
      message = phase.inGrace
        ? 'The window is open. Check in before the grace period runs out.'
        : 'Already at the gym? Check in early and they won’t lock at all.';
      break;
    }
    case 'missed':
      tone = colors.warning;
      chipIcon = 'alert-circle';
      chipLabel = 'Missed';
      message = `Today’s window closed at ${phase.closedAt} without a check-in. Your streak starts over next gym day.`;
      break;
    case 'rest': {
      tone = colors.textMuted;
      chipIcon = 'moon';
      chipLabel = 'Rest day';
      if (phase.next) {
        const c = clock(phase.next);
        big = (
          <View style={styles.numeralRow}>
            <Text style={[styles.numeral, { color: colors.text }]}>{c.time}</Text>
            <Text style={styles.period}>{c.period}</Text>
          </View>
        );
        caption = `${weekdayName(phase.next, now)} · next lock`;
      }
      message = 'Nothing locks today. Recover well.';
      break;
    }
  }

  const locked = phase.kind === 'locked';
  const done = phase.kind === 'done';
  const canCheckIn = phase.kind === 'locked' || phase.kind === 'upcoming';

  return (
    <View style={[styles.card, locked && styles.cardLocked, done && styles.cardDone]}>
      <View style={styles.topRow}>
        <View style={[styles.chip, { borderColor: tone }]}>
          <Ionicons name={chipIcon} size={13} color={tone} />
          <Text style={[styles.chipText, { color: tone }]}>{chipLabel.toUpperCase()}</Text>
        </View>
        {windowLabel ? <Text style={styles.window}>{windowLabel}</Text> : null}
      </View>

      {big ? (
        <View style={styles.bigWrap}>
          {big}
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      ) : null}

      {locked && (
        <View style={styles.track} accessibilityLabel={`${Math.round(phase.ratio * 100)} percent of the window gone`}>
          <View style={[styles.trackFill, { width: `${Math.max(3, phase.ratio * 100)}%` }]} />
        </View>
      )}

      <Text style={styles.message}>{message}</Text>

      {phase.kind === 'setup' && <Button title="Finish setup" onPress={onSetup} style={styles.cta} />}
      {canCheckIn && (
        <Button
          title={locked ? "I'm at the gym" : 'Check in early'}
          icon="camera"
          variant={locked ? 'primary' : 'secondary'}
          onPress={onCheckIn}
          style={styles.cta}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  cardLocked: { backgroundColor: colors.accentSurface, borderColor: colors.accentBorder },
  cardDone: { backgroundColor: colors.successSurface, borderColor: colors.successBorder },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  window: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  bigWrap: { marginTop: spacing.md },
  numeralRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  numeral: { ...type.numeralXL, fontVariant: ['tabular-nums'] },
  period: { color: colors.textMuted, fontFamily: type.numeralM.fontFamily, fontSize: 26, marginBottom: 10 },
  caption: { color: colors.textMuted, fontSize: 15, fontWeight: '600', marginTop: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: spacing.md, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
  message: { color: colors.text, opacity: 0.86, fontSize: 16, lineHeight: 22, marginTop: spacing.md },
  cta: { marginTop: spacing.lg },
});
