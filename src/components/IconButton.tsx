import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { IoniconName } from '../types';

interface IconButtonProps {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  tone?: 'default' | 'accent';
}

/** Round, 40pt (44pt hit area) icon button for headers and close actions. */
export function IconButton({ icon, onPress, accessibilityLabel, size = 40, tone = 'default' }: IconButtonProps) {
  const accent = tone === 'accent';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        accent && styles.accent,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={accent ? colors.accent : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  accent: { backgroundColor: colors.accentMuted },
  pressed: { opacity: 0.7 },
});
