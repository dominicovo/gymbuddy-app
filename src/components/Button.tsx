import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { IoniconName } from '../types';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IoniconName;
  style?: ViewStyle;
}

const LABEL_COLOR: Record<Variant, string> = {
  primary: colors.textOnAccent,
  secondary: colors.text,
  danger: colors.danger,
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, style }: ButtonProps) {
  const inactive = disabled || loading;
  const labelColor = inactive ? colors.textMuted : LABEL_COLOR[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inactive && (variant === 'primary' ? styles.primaryInactive : styles.mutedInactive),
        pressed && !inactive && styles[`${variant}Pressed` as const],
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={18} color={labelColor} />}
          <Text style={[styles.text, { color: labelColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // Stretches by default so a parent's `alignItems: center` can't quietly
    // shrink a full-width CTA down to the width of its label.
    alignSelf: 'stretch',
    minHeight: 52,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  primaryPressed: {
    backgroundColor: colors.accentStrong,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  danger: {
    backgroundColor: 'rgba(225, 123, 115, 0.10)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerPressed: {
    backgroundColor: 'rgba(225, 123, 115, 0.20)',
  },
  // A dimmed accent reads as "broken" on a dark ground, so disabled gets its
  // own solid surface instead of blanket opacity — keeps the label legible.
  primaryInactive: {
    backgroundColor: colors.surfaceAlt,
  },
  mutedInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
  },
});
