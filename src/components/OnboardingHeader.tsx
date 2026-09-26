import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme/colors';
import { IconButton } from './IconButton';

interface OnboardingHeaderProps {
  step: number;
  total?: number;
  title: string;
  subtitle: string;
  onBack?: () => void;
}

export function OnboardingHeader({ step, total = 3, title, subtitle, onBack }: OnboardingHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {onBack ? (
          <IconButton icon="chevron-back" onPress={onBack} accessibilityLabel="Back" size={36} />
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${total}`}
        >
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.segment, i < step && styles.segmentDone]} />
          ))}
        </View>
        <Text style={styles.stepText}>
          {step}/{total}
        </Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backSpacer: { width: 36, height: 36 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt },
  segmentDone: { backgroundColor: colors.accent },
  stepText: { color: colors.textMuted, fontFamily: type.numeralS.fontFamily, fontSize: 17, minWidth: 28, textAlign: 'right' },
  title: { color: colors.text, ...type.display },
  subtitle: { color: colors.textMuted, ...type.body, marginTop: spacing.sm },
});
