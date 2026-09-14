import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';
import { formatHHMM } from '../lib/time';

interface TimeStepperProps {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function TimeStepper({ label, value, onDecrement, onIncrement }: TimeStepperProps) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable style={styles.stepperButton} onPress={onDecrement}>
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.stepperValue}>{formatHHMM(value)}</Text>
        <Pressable style={styles.stepperButton} onPress={onIncrement}>
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  stepperLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '600', marginBottom: spacing.sm },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { color: colors.text, fontSize: 17, fontWeight: '700', minWidth: 76, textAlign: 'center' },
});
