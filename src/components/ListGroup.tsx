import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme/colors';
import { IoniconName } from '../types';

/** Small uppercase label above a group, iOS inset-grouped style. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A borderless rounded group of rows with hairlines between them. */
export function ListGroup({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.hairline} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

export type RowTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE: Record<RowTone, { fg: string; bg: string }> = {
  accent: { fg: colors.accent, bg: colors.accentMuted },
  success: { fg: colors.success, bg: colors.successMuted },
  warning: { fg: colors.warning, bg: colors.warningMuted },
  danger: { fg: colors.danger, bg: colors.dangerMuted },
  neutral: { fg: colors.textMuted, bg: colors.surfaceAlt },
};

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IoniconName;
  tone?: RowTone;
  /** Replaces the icon tile, e.g. an avatar. */
  leading?: React.ReactNode;
  /** Replaces value + chevron, e.g. a switch or a button. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  accessibilityLabel?: string;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  tone = 'accent',
  leading,
  trailing,
  onPress,
  destructive,
  showChevron,
  accessibilityLabel,
}: ListRowProps) {
  const t = TONE[destructive ? 'danger' : tone];
  const chevron = showChevron ?? !!onPress;

  const body = (
    <>
      {leading ??
        (icon ? (
          <View style={[styles.iconTile, { backgroundColor: t.bg }]}>
            <Ionicons name={icon} size={18} color={t.fg} />
          </View>
        ) : null)}
      <View style={styles.textWrap}>
        <Text style={[styles.title, destructive && { color: colors.danger }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <View style={styles.trailing}>
          {value ? (
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {chevron && <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />}
        </View>
      )}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
    >
      {body}
    </Pressable>
  );
}

/** Large title with an optional trailing accessory (icon buttons, badges). */
export function LargeHeader({ title, eyebrow, right }: { title: string; eyebrow?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.largeHeader}>
      <View style={styles.largeHeaderText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.largeTitle}>{title}</Text>
      </View>
      {right ? <View style={styles.largeHeaderRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.textMuted, ...type.eyebrow, fontSize: 12 },
  sectionAction: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginLeft: 64 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.md - 2,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  iconTile: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 18, marginTop: 2 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1, maxWidth: '50%' },
  value: { color: colors.textMuted, fontSize: 16, flexShrink: 1 },
  largeHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  largeHeaderText: { flex: 1 },
  largeHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: 4 },
  eyebrow: { color: colors.textMuted, ...type.eyebrow, fontSize: 12, marginBottom: 2 },
  largeTitle: { color: colors.text, ...type.display },
});
