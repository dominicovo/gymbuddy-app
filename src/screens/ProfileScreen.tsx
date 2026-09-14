import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LockStatusCard } from '../components/LockStatusCard';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, TabScreenProps } from '../navigation/types';

type Props = TabScreenProps<'Profile'>;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatMemberSince(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ProfileScreen({ navigation }: Props) {
  const fullName = useAuthStore((s) => s.fullName);
  const handle = useAuthStore((s) => s.handle);
  const pairCode = useAuthStore((s) => s.pairCode);
  const memberSince = useAuthStore((s) => s.memberSince);

  const schedule = useAppStore((s) => s.schedule);
  const gymLocation = useAppStore((s) => s.gymLocation);
  const restartOnboarding = useAppStore((s) => s.restartOnboarding);

  function confirmStartOver() {
    Alert.alert(
      'Start over?',
      'This clears your schedule, locked apps, and streaks, and takes you back through setup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: () => {
            restartOnboarding();
            navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({
              index: 0,
              routes: [{ name: 'OnboardingApps' }],
            });
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <Pressable style={styles.gearButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.identityTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(fullName)}</Text>
            </View>
            <View style={styles.identityTextWrap}>
              <Text style={styles.name}>{fullName || 'Your name'}</Text>
              <Text style={styles.handle}>
                @{handle || 'handle'} · code {pairCode}
              </Text>
            </View>
            <Pressable style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <DetailRow icon="barbell-outline" label="Home gym" value={gymLocation?.label ?? 'Not set'} />
          <DetailRow icon="calendar-outline" label="Gym days" value={schedule?.days.join(' · ') ?? 'None'} />
          <DetailRow icon="time-outline" label="Member since" value={formatMemberSince(memberSince)} />
        </View>

        <View style={styles.statusWrap}>
          <LockStatusCard variant="compact" />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.groupCard}>
          <Pressable style={styles.row} onPress={() => navigation.navigate('SharePairCard')}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="qr-code-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.rowLabel}>Pair code</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{pairCode}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable style={styles.row} onPress={confirmStartOver}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="refresh-outline" size={18} color={colors.danger} />
            </View>
            <Text style={styles.rowLabelDanger}>Start over</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} style={styles.rowChevron} />
          </Pressable>
        </View>

        <View style={styles.about}>
          <Text style={styles.aboutText}>GymBuddy · v1.0.0</Text>
          <Text style={styles.aboutText}>gymbuddy.live</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.detailIcon} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, ...type.display },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  identityTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.text, fontSize: 24, fontWeight: '800' },
  identityTextWrap: { flex: 1 },
  name: { color: colors.text, fontSize: 20, fontWeight: '700' },
  handle: { color: colors.textMuted, fontSize: 15, fontWeight: '500', marginTop: 2 },
  editButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  editButtonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  detailIcon: { marginRight: spacing.sm },
  detailLabel: { flex: 1, color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: '700', maxWidth: '55%' },
  statusWrap: { marginTop: spacing.md },
  sectionLabel: {
    color: colors.text,
    ...type.subtitle,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: { height: 1, backgroundColor: colors.border },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowLabel: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  rowLabelDanger: { flex: 1, color: colors.danger, fontSize: 17, fontWeight: '600' },
  rowChevron: { marginLeft: spacing.xs },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowValue: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  about: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.xs },
  aboutText: { color: colors.textMuted, ...type.caption },
});
