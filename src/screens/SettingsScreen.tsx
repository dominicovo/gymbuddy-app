import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { LockStatusCard } from '../components/LockStatusCard';
import { TimeStepper } from '../components/TimeStepper';
import { colors, radius, spacing, type } from '../theme/colors';
import { ALL_DAYS, DayOfWeek, IoniconName } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { stepHHMM } from '../lib/time';
import { RootStackScreenProps } from '../navigation/types';
import {
  hasScreenTimeAuthorization,
  lockNowForTesting,
  requestScreenTimeAuthorization,
  saveAppSelection,
  startScreenTimeMonitoring,
  updateShieldCopy,
} from '../lib/screenTime';
import { getCurrentLocation, searchLocation } from '../lib/location';
import { DeviceActivitySelectionSheetView } from 'react-native-device-activity';

type Props = RootStackScreenProps<'Settings'>;

const GRACE_STEP = 5;
const GRACE_MAX = 60;
const RADIUS_STEP = 25;
const RADIUS_MIN = 50;
const RADIUS_MAX = 500;

type ExpandedSection = 'days' | 'window' | 'gym' | 'grace' | 'radius' | null;

export function SettingsScreen({ navigation }: Props) {
  const schedule = useAppStore((s) => s.schedule);
  const setSchedule = useAppStore((s) => s.setSchedule);
  const appSelection = useAppStore((s) => s.appSelection);
  const setAppSelection = useAppStore((s) => s.setAppSelection);
  const gymLocation = useAppStore((s) => s.gymLocation);
  const setGymLocation = useAppStore((s) => s.setGymLocation);
  const graceMinutes = useAppStore((s) => s.graceMinutes);
  const setGraceMinutes = useAppStore((s) => s.setGraceMinutes);
  const checkInRadiusMeters = useAppStore((s) => s.checkInRadiusMeters);
  const setCheckInRadiusMeters = useAppStore((s) => s.setCheckInRadiusMeters);
  const strictMode = useAppStore((s) => s.strictMode);
  const setStrictMode = useAppStore((s) => s.setStrictMode);
  const streak = useAppStore((s) => s.streak);
  const pairCode = useAuthStore((s) => s.pairCode);
  const signOut = useAuthStore((s) => s.signOut);

  const [days, setDays] = useState<DayOfWeek[]>(schedule?.days ?? []);
  const [windowStart, setWindowStart] = useState(schedule?.windowStart ?? '06:00');
  const [windowEnd, setWindowEnd] = useState(schedule?.windowEnd ?? '20:00');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gymQuery, setGymQuery] = useState('');
  const [searchingGym, setSearchingGym] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const isDirty =
    JSON.stringify([...days].sort()) !== JSON.stringify([...(schedule?.days ?? [])].sort()) ||
    windowStart !== schedule?.windowStart ||
    windowEnd !== schedule?.windowEnd;

  const appCount = (appSelection?.applicationCount ?? 0) + (appSelection?.categoryCount ?? 0);

  function toggleExpanded(section: ExpandedSection) {
    if (strictMode && (section === 'days' || section === 'window') && schedule) {
      const lockState = useAppStore.getState().getLockState();
      if (lockState === 'locked') {
        Alert.alert('Strict mode is on', 'No schedule edits while the window is open. Turn off Strict mode to change this now.');
        return;
      }
    }
    setExpanded((cur) => (cur === section ? null : section));
  }

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function saveSchedule() {
    const next = { days, windowStart, windowEnd };
    setSavingSchedule(true);
    try {
      await startScreenTimeMonitoring(next, graceMinutes);
      updateShieldCopy({ schedule: next, gymName: gymLocation?.label ?? null, streak });
    } catch (error) {
      Alert.alert('Could not update schedule', 'The schedule was saved, but re-registering it with Screen Time failed. Try again.');
      console.warn('startScreenTimeMonitoring failed', error);
    }
    setSavingSchedule(false);
    setSchedule(next);
    setExpanded(null);
  }

  async function openPicker() {
    if (!hasScreenTimeAuthorization()) {
      setRequesting(true);
      const granted = await requestScreenTimeAuthorization().finally(() => setRequesting(false));
      if (!granted) {
        Alert.alert(
          'Screen Time access needed',
          'GymBuddy needs Screen Time permission to lock apps. You can allow this under Settings › Screen Time › GymBuddy.'
        );
        return;
      }
    }
    setPickerVisible(true);
  }

  async function useCurrentLocationForGym() {
    setLocating(true);
    const result = await getCurrentLocation();
    setLocating(false);

    if (!result) {
      Alert.alert(
        'Location access needed',
        'GymBuddy needs your location to confirm you actually showed up. You can allow this under Settings › Privacy › Location Services.'
      );
      return;
    }
    setGymLocation(result);
    if (schedule) updateShieldCopy({ schedule, gymName: result.label, streak });
    setExpanded(null);
  }

  async function searchForGym() {
    if (!gymQuery.trim()) return;
    setSearchingGym(true);
    const result = await searchLocation(gymQuery);
    setSearchingGym(false);

    if (!result) {
      Alert.alert('No match found', "Couldn't find that place. Try a fuller address.");
      return;
    }
    setGymLocation(result);
    if (schedule) updateShieldCopy({ schedule, gymName: result.label, streak });
    setExpanded(null);
    setGymQuery('');
  }

  function adjustGrace(delta: number) {
    setGraceMinutes(Math.max(0, Math.min(GRACE_MAX, graceMinutes + delta)));
  }

  function adjustRadius(delta: number) {
    setCheckInRadiusMeters(Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, checkInRadiusMeters + delta)));
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', "You'll need to sign back in to unlock apps.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          signOut();
          navigation.reset({ index: 0, routes: [{ name: 'AuthEntry' }] });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        <LockStatusCard variant="compact" showStreak />

        <Text style={styles.sectionLabel}>LOCK</Text>
        <View style={styles.groupCard}>
          <SettingsRow
            icon="calendar-outline"
            title="Gym days"
            value={days.length ? days.join(' · ') : 'Not set'}
            onPress={() => toggleExpanded('days')}
          />
          {expanded === 'days' && (
            <View style={styles.expandedWrap}>
              <View style={styles.dayRow}>
                {ALL_DAYS.map((day) => (
                  <Chip key={day} label={day} selected={days.includes(day)} onPress={() => toggleDay(day)} />
                ))}
              </View>
              {isDirty && <Button title="Save schedule" loading={savingSchedule} onPress={saveSchedule} />}
            </View>
          )}

          <View style={styles.rowDivider} />
          <SettingsRow
            icon="time-outline"
            title="Lock window"
            value={`${formatDisplay(windowStart)} – ${formatDisplay(windowEnd)}`}
            onPress={() => toggleExpanded('window')}
          />
          {expanded === 'window' && (
            <View style={styles.expandedWrap}>
              <View style={styles.timeRow}>
                <TimeStepper
                  label="From"
                  value={windowStart}
                  onDecrement={() => setWindowStart((t) => stepHHMM(t, -30))}
                  onIncrement={() => setWindowStart((t) => stepHHMM(t, 30))}
                />
                <TimeStepper
                  label="Until"
                  value={windowEnd}
                  onDecrement={() => setWindowEnd((t) => stepHHMM(t, -30))}
                  onIncrement={() => setWindowEnd((t) => stepHHMM(t, 30))}
                />
              </View>
              {isDirty && <Button title="Save schedule" loading={savingSchedule} onPress={saveSchedule} />}
            </View>
          )}

          <View style={styles.rowDivider} />
          <SettingsRow
            icon="lock-closed-outline"
            title="Locked apps"
            value={appCount > 0 ? `${appCount} selected` : requesting ? 'Requesting…' : 'No apps selected'}
            onPress={openPicker}
          />

          <View style={styles.rowDivider} />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Strict mode"
            subtitle="No schedule or app edits while the window is open"
            showChevron={false}
            right={
              <Switch
                value={strictMode}
                onValueChange={setStrictMode}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.border}
              />
            }
          />

          <View style={styles.rowDivider} />
          <SettingsRow
            icon="hourglass-outline"
            title="Grace period"
            subtitle="Free minutes after the window opens"
            value={`${graceMinutes} min`}
            onPress={() => toggleExpanded('grace')}
          />
          {expanded === 'grace' && (
            <View style={styles.expandedWrap}>
              <Stepper
                value={`${graceMinutes} min`}
                onDecrement={() => adjustGrace(-GRACE_STEP)}
                onIncrement={() => adjustGrace(GRACE_STEP)}
              />
            </View>
          )}
        </View>

        {pickerVisible && (
          <DeviceActivitySelectionSheetView
            style={styles.hiddenAnchor}
            headerText="Apps to lock on gym days"
            onDismissRequest={() => setPickerVisible(false)}
            onSelectionChange={(event) => {
              const { familyActivitySelection, applicationCount, categoryCount, webDomainCount } =
                event.nativeEvent;
              if (familyActivitySelection) {
                saveAppSelection(familyActivitySelection);
              }
              setAppSelection({ applicationCount, categoryCount, webDomainCount });
            }}
          />
        )}

        <Text style={styles.sectionLabel}>CHECK-IN</Text>
        <View style={styles.groupCard}>
          <SettingsRow
            icon="location-outline"
            title="Gym location"
            value={gymLocation ? gymLocation.label : 'Not set'}
            onPress={() => toggleExpanded('gym')}
          />
          {expanded === 'gym' && (
            <View style={styles.expandedWrap}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search gym name or address"
                  placeholderTextColor={colors.textMuted}
                  value={gymQuery}
                  onChangeText={setGymQuery}
                  onSubmitEditing={searchForGym}
                  returnKeyType="search"
                />
                <Button title="Search" variant="secondary" loading={searchingGym} onPress={searchForGym} style={styles.searchButton} />
              </View>
              <Button
                title="Use My Current Location"
                variant="secondary"
                loading={locating}
                onPress={useCurrentLocationForGym}
              />
            </View>
          )}

          <View style={styles.rowDivider} />
          <SettingsRow
            icon="radio-outline"
            title="Check-in radius"
            subtitle="How close counts as there"
            value={`${checkInRadiusMeters} m`}
            onPress={() => toggleExpanded('radius')}
          />
          {expanded === 'radius' && (
            <View style={styles.expandedWrap}>
              <Stepper
                value={`${checkInRadiusMeters} m`}
                onDecrement={() => adjustRadius(-RADIUS_STEP)}
                onIncrement={() => adjustRadius(RADIUS_STEP)}
              />
            </View>
          )}

          <View style={styles.rowDivider} />
          <SettingsRow
            icon="camera-outline"
            title="Proof required"
            value="Photo + location"
            onPress={() => Alert.alert('Coming soon', 'Other proof types are on the way. For now, GymBuddy checks a photo plus your location.')}
          />
        </View>

        <Text style={styles.sectionLabel}>BUDDIES</Text>
        <View style={styles.groupCard}>
          <SettingsRow
            icon="qr-code-outline"
            title="Pair code"
            value={pairCode}
            onPress={() => navigation.navigate('SharePairCard')}
          />
        </View>

        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.groupCard}>
          <SettingsRow icon="notifications-outline" title="Reminders" value="Coming soon" showChevron={false} />
        </View>

        <Text style={styles.sectionLabel}>DEBUG</Text>
        <Button
          title="Lock Now (test)"
          variant="secondary"
          onPress={() => {
            lockNowForTesting();
            Alert.alert('Sent', 'Tried locking your selected apps immediately, bypassing the schedule. Try opening one now.');
          }}
        />

        <Text style={styles.accountLabel}>ACCOUNT</Text>
        <Button title="Sign out" variant="danger" icon="log-out-outline" onPress={confirmSignOut} />
        <Text style={styles.signOutCaption}>
          Your schedule, streak and buddies stay on your account. Signing back in restores them.
        </Text>

        <View style={styles.about}>
          <Text style={styles.aboutText}>GymBuddy · v1.0.0</Text>
          <Text style={styles.aboutText}>gymbuddy.live</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface SettingsRowProps {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsRow({ icon, title, subtitle, value, showChevron = true, right, onPress, danger }: SettingsRowProps) {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.accent} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={danger ? styles.rowLabelDanger : styles.rowLabel}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (
        <View style={styles.rowRight}>
          {value ? (
            <Text style={styles.rowValue} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {showChevron && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
        </View>
      )}
    </View>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

function Stepper({ value, onDecrement, onIncrement }: { value: string; onDecrement: () => void; onIncrement: () => void }) {
  return (
    <View style={styles.stepperRow}>
      <Pressable style={styles.stepperButton} onPress={onDecrement}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={onIncrement}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, ...type.display },
  sectionLabel: {
    color: colors.textMuted,
    ...type.label,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: { height: 1, backgroundColor: colors.border },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowTextWrap: { flex: 1, marginRight: spacing.sm },
  rowLabel: { color: colors.text, fontSize: 17, fontWeight: '700' },
  rowLabelDanger: { color: colors.danger, fontSize: 17, fontWeight: '700' },
  rowSubtitle: { color: colors.textMuted, fontSize: 14, marginTop: 2, lineHeight: 16 },
  // Capped so a long value (a full gym address, say) can't crowd out the label.
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1, maxWidth: '55%' },
  rowValue: { color: colors.textMuted, fontSize: 17, fontWeight: '500', flexShrink: 1 },
  expandedWrap: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  hiddenAnchor: { width: 1, height: 1, position: 'absolute' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { color: colors.text, fontSize: 17, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontSize: 17,
  },
  searchButton: { paddingHorizontal: spacing.lg },
  accountLabel: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  signOutCaption: {
    color: colors.textMuted,
    ...type.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  about: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.xs },
  aboutText: { color: colors.textMuted, ...type.caption },
});
