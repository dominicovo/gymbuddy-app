import React from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SharePairCard'>;

export function SharePairCardScreen({ navigation }: Props) {
  const fullName = useAuthStore((s) => s.fullName);
  const pairCode = useAuthStore((s) => s.pairCode);
  const schedule = useAppStore((s) => s.schedule);
  const gymLocation = useAppStore((s) => s.gymLocation);

  const link = `gymbuddy.live/b/${pairCode}`;
  const scheduleLine = schedule
    ? `${schedule.days.join(' · ')}${gymLocation ? `, at ${gymLocation.label}` : ''}`
    : 'No schedule set yet';

  async function shareVia() {
    await Share.share({ message: `Pair with me on GymBuddy — https://${link}` });
  }

  async function copyLink() {
    await Clipboard.setStringAsync(`https://${link}`);
    Alert.alert('Copied', 'Link copied to your clipboard.');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Share your pair card</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.qrBox}>
          <Ionicons name="qr-code-outline" size={72} color={colors.text} />
          <Text style={styles.qrLabel}>QR placeholder</Text>
        </View>
        <Text style={styles.cardName}>{fullName || 'Your name'} · gymBuddy</Text>
        <Text style={styles.cardSchedule}>{scheduleLine}</Text>
        <View style={styles.linkPill}>
          <Ionicons name="link-outline" size={14} color={colors.text} />
          <Text style={styles.linkText}>{link}</Text>
        </View>
      </View>

      <View style={styles.groupCard}>
        <Pressable style={styles.row} onPress={shareVia}>
          <Ionicons name="share-outline" size={18} color={colors.accent} style={styles.rowIcon} />
          <Text style={styles.rowLabel}>Share via…</Text>
          <Text style={styles.rowValue}>Messages, WhatsApp</Text>
        </Pressable>
        <View style={styles.rowDivider} />
        <Pressable style={styles.row} onPress={copyLink}>
          <Ionicons name="copy-outline" size={18} color={colors.accent} style={styles.rowIcon} />
          <Text style={styles.rowLabel}>Copy link</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {link}
          </Text>
        </Pressable>
      </View>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.orLine} />
      </View>

      <Pressable style={styles.scanRow} onPress={() => navigation.navigate('ScanCode')}>
        <Ionicons name="scan-outline" size={18} color={colors.text} style={styles.rowIcon} />
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowLabelStacked}>Scan their code</Text>
          <Text style={styles.rowHint}>Pair in person with a QR or four digits</Text>
        </View>
      </Pressable>

      <Text style={styles.footerNote}>
        They see your gym days, window and streak. Never your locked apps or location history.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  title: { flex: 1, color: colors.text, ...type.display, fontSize: 28, marginRight: spacing.md },
  doneText: { color: colors.accent, fontSize: 17, fontWeight: '700', paddingTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  qrBox: {
    width: 160,
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  qrLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: spacing.xs },
  cardName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  cardSchedule: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.md,
  },
  linkText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  groupCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  rowIcon: { marginRight: spacing.md },
  rowTextWrap: { flex: 1 },
  rowLabel: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  rowLabelStacked: { color: colors.text, fontSize: 17, fontWeight: '700' },
  rowHint: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  rowValue: { color: colors.textMuted, fontSize: 15, fontWeight: '600', maxWidth: '45%' },
  rowDivider: { height: 1, backgroundColor: colors.border },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, ...type.caption },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: spacing.lg,
  },
});
