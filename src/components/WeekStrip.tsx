import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme/colors';
import { WeekDayStatus } from '../lib/weekTracker';

interface WeekStripProps {
  days: WeekDayStatus[];
  /** ISO date lock scheduling began; earlier days are never "missed". */
  startedAt: string | null;
}

export function WeekStrip({ days, startedAt }: WeekStripProps) {
  const scheduled = days.filter((d) => d.scheduled);
  const done = scheduled.filter((d) => d.done).length;
  const todayIso = days.find((d) => d.isToday)?.date ?? '';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>This week</Text>
        <Text style={styles.summary}>
          <Text style={styles.summaryStrong}>{done}</Text> of {scheduled.length} gym days
        </Text>
      </View>
      <View style={styles.row}>
        {days.map((d) => {
          const missed = d.scheduled && !d.done && d.date < todayIso && (!startedAt || d.date >= startedAt);
          const dayNum = Number(d.date.slice(8));
          return (
            <View key={d.date} style={styles.col} accessibilityLabel={`${d.day} ${dayNum}: ${d.done ? 'checked in' : missed ? 'missed' : d.scheduled ? 'gym day' : 'rest day'}`}>
              <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>{d.day.slice(0, 1)}</Text>
              <View
                style={[
                  styles.cell,
                  d.scheduled && styles.cellScheduled,
                  missed && styles.cellMissed,
                  d.done && styles.cellDone,
                  d.isToday && !d.done && styles.cellToday,
                ]}
              >
                {d.done ? (
                  <Ionicons name="checkmark" size={17} color={colors.textOnAccent} />
                ) : (
                  <Text
                    style={[
                      styles.dateNum,
                      !d.scheduled && styles.dateNumRest,
                      missed && { color: colors.warning },
                    ]}
                  >
                    {dayNum}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  title: { color: colors.text, ...type.subtitle },
  summary: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  summaryStrong: { color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 6 },
  dayLabel: { color: colors.textFaint, fontSize: 13, fontWeight: '700' },
  dayLabelToday: { color: colors.accent },
  cell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellScheduled: { backgroundColor: colors.surfaceAlt },
  cellMissed: { backgroundColor: colors.warningMuted },
  cellDone: { backgroundColor: colors.accent },
  cellToday: { borderWidth: 2, borderColor: colors.accent },
  dateNum: { color: colors.text, fontFamily: type.numeralS.fontFamily, fontSize: 18 },
  dateNumRest: { color: colors.textFaint },
});
