import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ListGroup, ListRow, SectionHeader } from '../components/ListGroup';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { formatDays } from '../lib/schedule';
import { pairLink } from '../lib/pairLinks';

type Props = NativeStackScreenProps<RootStackParamList, 'SharePairCard'>;

/** "every day" / "weekdays" read as prose; a day list keeps its capitals. */
function trainsOn(days: string): string {
  return ['Every day', 'Weekdays', 'Weekends'].includes(days) ? days.toLowerCase() : days;
}

export function SharePairCardScreen({ navigation }: Props) {
  const fullName = useAuthStore((s) => s.fullName);
  const handle = useAuthStore((s) => s.handle);
  const pairCode = useAuthStore((s) => s.pairCode);
  const avatarUrl = useAuthStore((s) => s.avatarUrl);
  const schedule = useAppStore((s) => s.schedule);
  const [copied, setCopied] = useState(false);

  const link = pairLink(pairCode);
  const digits = (pairCode || '----').split('');

  async function shareInvite() {
    await Share.share({
      message: `Keep me honest at the gym \u2014 be my GymBuddy. Tap to pair: ${link}\n\nOr open GymBuddy \u2192 Buddies \u2192 Add \u2192 Enter their code: ${pairCode}`,
    });
  }

  async function copyCode() {
    await Clipboard.setStringAsync(pairCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Add a buddy</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button">
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.card} accessible accessibilityLabel={`Your pair code is ${digits.join(' ')}`}>
        <View style={styles.cardTop}>
          <Avatar name={fullName || '?'} seed={handle} uri={avatarUrl} size={40} />
          <View style={styles.cardIdentity}>
            <Text style={styles.cardName} numberOfLines={1}>
              {fullName || 'Your name'}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {schedule ? `Trains ${trainsOn(formatDays(schedule.days))}` : 'GymBuddy'}
            </Text>
          </View>
          <Ionicons name="barbell" size={22} color={colors.accent} />
        </View>
        <Text style={styles.codeLabel}>PAIR CODE</Text>
        <View style={styles.codeRow}>
          {digits.map((d, i) => (
            <View key={i} style={styles.digitBox}>
              <Text style={styles.digit}>{d}</Text>
            </View>
          ))}
        </View>
      </View>

      <ListGroup style={styles.actions}>
        <ListRow icon="share-outline" title="Share invite" subtitle="Messages, WhatsApp, anywhere" onPress={shareInvite} />
        <ListRow
          icon={copied ? 'checkmark' : 'copy-outline'}
          tone={copied ? 'success' : 'accent'}
          title={copied ? 'Copied' : 'Copy code'}
          onPress={copyCode}
          showChevron={false}
        />
      </ListGroup>

      <SectionHeader title="Have their code?" />
      <ListGroup>
        <ListRow icon="keypad" title="Enter their code" subtitle="Four digits from their pair card" onPress={() => navigation.navigate('ScanCode')} />
      </ListGroup>

      <Text style={styles.footnote}>
        Buddies see your name, gym days, check-ins and streak. Never your locked apps or where you are.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md + 4 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  title: { color: colors.text, ...type.title },
  done: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  card: {
    backgroundColor: colors.accentSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  cardIdentity: { flex: 1 },
  cardName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardMeta: { color: colors.textMuted, fontSize: 14, marginTop: 1 },
  codeLabel: { color: colors.textMuted, ...type.eyebrow, fontSize: 12, marginTop: spacing.lg },
  codeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  digitBox: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { color: colors.text, ...type.numeralXL, fontSize: 64, lineHeight: 70 },
  actions: { marginTop: spacing.lg },
  footnote: { color: colors.textMuted, ...type.caption, lineHeight: 18, textAlign: 'center', marginTop: 'auto', paddingBottom: spacing.sm },
});
