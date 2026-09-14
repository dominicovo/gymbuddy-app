import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, radius, spacing, type } from '../../theme/colors';
import { IoniconName } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { requestScreenTimeAuthorization } from '../../lib/screenTime';
import { requestLocationPermission } from '../../lib/location';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthPermissions'>;

interface PermissionRow {
  key: 'screenTime' | 'notifications' | 'location';
  icon: IoniconName;
  label: string;
  hint: string;
}

const ROWS: PermissionRow[] = [
  {
    key: 'screenTime',
    icon: 'phone-portrait-outline',
    label: 'Screen Time',
    hint: 'Locks the apps you pick. Apple keeps the list private.',
  },
  {
    key: 'notifications',
    icon: 'notifications-outline',
    label: 'Notifications',
    hint: 'Window reminders, buddy check-ins, streak warnings.',
  },
  {
    key: 'location',
    icon: 'location-outline',
    label: 'Location',
    hint: 'Used only to confirm you are at the gym.',
  },
];

export function AuthPermissionsScreen({ navigation }: Props) {
  const permissions = useAuthStore((s) => s.permissions);
  const setPermission = useAuthStore((s) => s.setPermission);
  const completeSignUp = useAuthStore((s) => s.completeSignUp);
  const [requesting, setRequesting] = useState<PermissionRow['key'] | null>(null);

  async function allow(key: PermissionRow['key']) {
    setRequesting(key);
    try {
      if (key === 'screenTime') {
        const granted = await requestScreenTimeAuthorization();
        setPermission('screenTime', granted);
      } else if (key === 'location') {
        const granted = await requestLocationPermission();
        setPermission('location', granted);
      } else {
        // No notification system wired up yet — flip the UI state only.
        setPermission('notifications', true);
      }
    } catch (error) {
      console.warn(`requesting ${key} permission failed`, error);
    }
    setRequesting(null);
  }

  const allGranted = permissions.screenTime && permissions.notifications && permissions.location;

  function next() {
    if (!permissions.screenTime) return;
    completeSignUp();
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingApps' }] });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ACCESS</Text>
        <Text style={styles.title}>Three permissions</Text>
        <Text style={styles.subtitle}>
          GymBuddy can't lock anything without them. Screen Time is the one that does the work.
        </Text>
      </View>

      <View style={styles.rows}>
        {ROWS.map((row) => {
          const granted = permissions[row.key];
          return (
            <View key={row.key} style={styles.row}>
              <View style={styles.rowIconWrap}>
                <Ionicons name={row.icon} size={20} color={colors.accent} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowHint}>{row.hint}</Text>
              </View>
              <Pressable
                style={[styles.allowButton, granted && styles.allowedButton]}
                onPress={() => allow(row.key)}
                disabled={granted || requesting === row.key}
              >
                <Text style={[styles.allowButtonText, granted && styles.allowedButtonText]}>
                  {requesting === row.key ? '…' : granted ? 'Allowed' : 'Allow'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button title={allGranted ? 'Start setup' : 'Continue'} disabled={!permissions.screenTime} onPress={next} />
        <Text style={styles.footerNote}>
          {permissions.screenTime
            ? 'Apple keeps your locked-app list private. We only ever see that a lock is on.'
            : 'Screen Time is the one GymBuddy genuinely cannot work without — it is what locks the apps. Notifications and location are optional.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  eyebrow: { color: colors.accent, ...type.eyebrow },
  title: { color: colors.text, ...type.display, marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, ...type.body, marginTop: spacing.sm },
  rows: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowTextWrap: { flex: 1, marginRight: spacing.sm },
  rowLabel: { color: colors.text, fontSize: 17, fontWeight: '700' },
  rowHint: { color: colors.textMuted, fontSize: 14, marginTop: 2, lineHeight: 16 },
  allowButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  allowedButton: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  allowButtonText: { color: colors.textOnAccent, fontSize: 15, fontWeight: '700' },
  allowedButtonText: { color: colors.textMuted },
  footer: { marginTop: 'auto', paddingTop: spacing.lg, gap: spacing.md },
  footerNote: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 17 },
});
