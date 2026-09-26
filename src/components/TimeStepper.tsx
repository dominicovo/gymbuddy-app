import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatHHMM } from '../lib/time';

interface TimeStepperProps {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function TimeStepper({ label, value, onDecrement, onIncrement }: TimeStepperProps) {
  const [time, period] = formatHHMM(value).split(' ');
  return (
    <View style={styles.stepper}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.valueRow} accessible accessibilityLabel={`${label} ${formatHHMM(value)}`}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.period}>{period}</Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={onDecrement}
          accessibilityRole="button"
          accessibilityLabel={`${label} 30 minutes earlier`}
        >
          <Ionicons name="remove" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={onIncrement}
          accessibilityRole="button"
          accessibilityLabel={`${label} 30 minutes later`}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  label: { color: colors.textMuted, ...type.eyebrow, fontSize: 12 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: spacing.xs },
  time: { color: colors.text, ...type.numeralL, fontSize: 44, lineHeight: 48 },
  period: { color: colors.textMuted, fontFamily: type.numeralM.fontFamily, fontSize: 20, marginBottom: 6 },
  controls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  button: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceRaised },
});
