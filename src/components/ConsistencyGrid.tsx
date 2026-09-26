import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme/colors';
import { DayCell } from '../lib/stats';

const CELL_COLOR: Record<DayCell, string> = {
  done: colors.accent,
  missed: 'rgba(240, 179, 91, 0.38)',
  rest: colors.surfaceAlt,
  upcoming: 'transparent',
  before: 'rgba(255,255,255,0.015)',
};

const ROW_LABELS = ['M', '', 'W', '', 'F', '', ''];

interface ConsistencyGridProps {
  columns: { date: string; cell: DayCell }[][];
}

/** Twelve weeks, one column per week (Mon at top), GitHub-contribution style. */
export function ConsistencyGrid({ columns }: ConsistencyGridProps) {
  // A month label sits over the first week that starts in that month.
  const monthLabels = columns.map((col, i) => {
    const month = col[0].date.slice(5, 7);
    const prev = i > 0 ? columns[i - 1][0].date.slice(5, 7) : null;
    if (month === prev) return '';
    return new Date(col[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' });
  });

  return (
    <View style={styles.card}>
      <View style={styles.monthRow}>
        <View style={styles.rowLabelCol} />
        {monthLabels.map((m, i) => (
          <View key={i} style={styles.monthCell}>
            {m ? (
              <Text style={styles.monthText} numberOfLines={1}>
                {m}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        <View style={styles.rowLabelCol}>
          {ROW_LABELS.map((l, i) => (
            <View key={i} style={styles.rowLabelCell}>
              <Text style={styles.rowLabel}>{l}</Text>
            </View>
          ))}
        </View>
        {columns.map((col, i) => (
          <View key={i} style={styles.column}>
            {col.map((d) => (
              <View
                key={d.date}
                style={[
                  styles.cell,
                  { backgroundColor: CELL_COLOR[d.cell] },
                  d.cell === 'upcoming' && styles.cellUpcoming,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Legend color={CELL_COLOR.done} label="Checked in" />
        <Legend color={CELL_COLOR.missed} label="Missed" />
        <Legend color={CELL_COLOR.rest} label="Rest" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const GAP = 4;

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  monthRow: { flexDirection: 'row', gap: GAP, marginBottom: 6 },
  monthCell: { flex: 1, overflow: 'visible' },
  monthText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', width: 40 },
  grid: { flexDirection: 'row', gap: GAP },
  rowLabelCol: { width: 12, gap: GAP },
  rowLabelCell: { flex: 1, justifyContent: 'center' },
  rowLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '700' },
  column: { flex: 1, gap: GAP },
  cell: { aspectRatio: 1, borderRadius: 4 },
  cellUpcoming: { borderWidth: 1, borderColor: colors.border },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: colors.textMuted, ...type.caption, fontSize: 12 },
});
