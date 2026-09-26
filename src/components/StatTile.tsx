import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme/colors';
import { IoniconName } from '../types';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  icon?: IoniconName;
  color?: string;
}

export function StatTile({ label, value, unit, icon, color = colors.text }: StatTileProps) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <View style={styles.labelRow}>
        {icon ? <Ionicons name={icon} size={13} color={colors.textMuted} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  value: { ...type.numeralL },
  unit: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
});
