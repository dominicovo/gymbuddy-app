import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';
import { DayOfWeek } from '../types';

const WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRESETS: { label: string; days: DayOfWeek[] }[] = [
  { label: 'Mon · Wed · Fri', days: ['Mon', 'Wed', 'Fri'] },
  { label: 'Weekdays', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { label: 'Every day', days: WEEK },
];

interface DayPickerProps {
  value: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  showPresets?: boolean;
}

export function DayPicker({ value, onChange, showPresets = true }: DayPickerProps) {
  const same = (a: DayOfWeek[], b: DayOfWeek[]) => a.length === b.length && a.every((d) => b.includes(d));

  function toggle(day: DayOfWeek) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {WEEK.map((day) => {
          const on = value.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggle(day)}
              style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && styles.dayPressed]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={day}
            >
              <Text style={[styles.dayText, on && styles.dayTextOn]}>{day.slice(0, 2)}</Text>
            </Pressable>
          );
        })}
      </View>
      {showPresets && (
        <View style={styles.presets}>
          {PRESETS.map((p) => {
            const active = same(value, p.days);
            return (
              <Pressable
                key={p.label}
                onPress={() => onChange(p.days)}
                style={[styles.preset, active && styles.presetOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.presetText, active && styles.presetTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.accent },
  dayPressed: { opacity: 0.75 },
  dayText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  dayTextOn: { color: colors.textOnAccent },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presetOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  presetText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  presetTextOn: { color: colors.accent },
});
