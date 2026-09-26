import React, { useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DeviceActivitySelectionSheetView } from 'react-native-device-activity';
import { Button } from '../components/Button';
import { DayPicker } from '../components/DayPicker';
import { IconButton } from '../components/IconButton';
import { ListGroup, ListRow, SectionHeader } from '../components/ListGroup';
import { TimeStepper } from '../components/TimeStepper';
import { colors, radius, spacing, type } from '../theme/colors';
import { DayOfWeek } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatHHMM, stepHHMM } from '../lib/time';
import { formatDays } from '../lib/schedule';
import { RootStackScreenProps } from '../navigation/types';
import {
  hasScreenTimeAuthorization,
  lockNowForTesting,
  requestScreenTimeAuthorization,
  saveAppSelection,
  startScreenTimeMonitoring,
  updateShieldCopy,
} from '../lib/screenTime';
import { ResolvedLocation } from '../lib/location';
import { GymPicker } from '../components/GymPicker';
import { LOCATION_CHECK_IN } from '../config/features';

type Props = RootStackScreenProps<'Settings'>;

const GRACE_STEP = 5;
const GRACE_MAX = 60;
const RADIUS_STEP = 25;
const RADIUS_MIN = 50;
const RADIUS_MAX = 500;

type ExpandedSection = 'schedule' | 'gym' | 'grace' | 'radius' | null;

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
  const email = useAuthStore((s) => s.email);
  const provider = useAuthStore((s) => s.provider);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bypassed = useAuthStore((s) => s.bypassed);
  const [deleting, setDeleting] = useState(false);

  const [days, setDays] = useState<DayOfWeek[]>(schedule?.days ?? []);
  const [windowStart, setWindowStart] = useState(schedule?.windowStart ?? '06:00');
  const [windowEnd, setWindowEnd] = useState(schedule?.windowEnd ?? '20:00');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Offsets used to lift the gym search above the keyboard.
  const checkInY = useRef(0);
  const gymPanelY = useRef(0);

  const isDirty =
    JSON.stringify([...days].sort()) !== JSON.stringify([...(schedule?.days ?? [])].sort()) ||
    windowStart !== schedule?.windowStart ||
    windowEnd !== schedule?.windowEnd;

  const appCount = (appSelection?.applicationCount ?? 0) + (appSelection?.categoryCount ?? 0);

  function toggleExpanded(section: ExpandedSection) {
    if (strictMode && section === 'schedule' && schedule) {
      if (useAppStore.getState().getLockState() === 'locked') {
        Alert.alert('Strict mode is on', 'No schedule edits while the window is open. Check in first, or turn off Strict mode.');
        return;
      }
    }
    setExpanded((cur) => (cur === section ? null : section));
  }

  async function saveSchedule() {
    if (days.length === 0) {
      Alert.alert('Pick at least one day', 'GymBuddy needs at least one gym day to lock on.');
      return;
    }
    const next = { days, windowStart, windowEnd };
    setSavingSchedule(true);
    try {
      await startScreenTimeMonitoring(next, graceMinutes);
      updateShieldCopy({ schedule: next, gymName: gymLocation?.label ?? null, streak });
    } catch (error) {
      Alert.alert('Could not update Screen Time', 'The schedule was saved, but re-registering it with Screen Time failed. Try again.');
      console.warn('startScreenTimeMonitoring failed', error);
    }
    setSavingSchedule(false);
    setSchedule(next);
    setExpanded(null);
  }

  async function openPicker() {
    if (strictMode && useAppStore.getState().getLockState() === 'locked') {
      Alert.alert('Strict mode is on', 'No app changes while the window is open. Check in first, or turn off Strict mode.');
      return;
    }
    if (!hasScreenTimeAuthorization()) {
      setRequesting(true);
      const granted = await requestScreenTimeAuthorization().finally(() => setRequesting(false));
      if (!granted) {
        Alert.alert('Screen Time access needed', 'GymBuddy needs Screen Time permission to lock apps.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
    }
    setPickerVisible(true);
  }

  function changeGym(gym: ResolvedLocation) {
    setGymLocation(gym);
    if (schedule) updateShieldCopy({ schedule, gymName: gym.label, streak });
    setExpanded(null);
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your locks keep running on this phone. Sign back in to see buddies again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void signOut();
          navigation.reset({ index: 0, routes: [{ name: 'AuthEntry' }] });
        },
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, photo, buddies and check-in history. Your locks on this phone keep running. This can\u2019t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteAccount();
            setDeleting(false);
            if (error) {
              Alert.alert('Account not deleted', error);
              return;
            }
            navigation.reset({ index: 0, routes: [{ name: 'AuthEntry' }] });
          },
        },
      ],
    );
  }

  const signedInAs = email ?? (provider ? `Signed in with ${provider === 'apple' ? 'Apple' : 'Google'}` : 'Not signed in');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" onPress={() => navigation.goBack()} accessibilityLabel="Back" size={36} />
        </View>
        <Text style={styles.title}>Settings</Text>

        <SectionHeader title="Lock" />
        <ListGroup>
          <ListRow
            icon="calendar"
            title="Schedule"
            subtitle={
              schedule
                ? `${formatDays(schedule.days)} · ${formatHHMM(schedule.windowStart)} – ${formatHHMM(schedule.windowEnd)}`
                : 'Not set'
            }
            onPress={() => toggleExpanded('schedule')}
          />
          {expanded === 'schedule' && (
            <View style={styles.panel}>
              <DayPicker value={days} onChange={setDays} />
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
          <ListRow
            icon="apps"
            title="Locked apps"
            value={requesting ? 'Requesting…' : appCount > 0 ? `${appCount} selected` : 'None'}
            onPress={openPicker}
          />
          <ListRow
            icon="hourglass"
            title="Grace period"
            subtitle="Free minutes after the window opens"
            value={`${graceMinutes} min`}
            onPress={() => toggleExpanded('grace')}
          />
          {expanded === 'grace' && (
            <View style={styles.panel}>
              <Stepper
                value={`${graceMinutes} min`}
                onDecrement={() => setGraceMinutes(Math.max(0, graceMinutes - GRACE_STEP))}
                onIncrement={() => setGraceMinutes(Math.min(GRACE_MAX, graceMinutes + GRACE_STEP))}
              />
            </View>
          )}
          <ListRow
            icon="shield-checkmark"
            title="Strict mode"
            subtitle="No schedule or app changes while locked"
            trailing={
              <Switch
                value={strictMode}
                onValueChange={setStrictMode}
                trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
                ios_backgroundColor={colors.surfaceRaised}
                accessibilityLabel="Strict mode"
              />
            }
          />
        </ListGroup>

        {pickerVisible && (
          <DeviceActivitySelectionSheetView
            style={styles.hiddenAnchor}
            headerText="Apps to lock on gym days"
            onDismissRequest={() => setPickerVisible(false)}
            onSelectionChange={(event) => {
              const { familyActivitySelection, applicationCount, categoryCount, webDomainCount } = event.nativeEvent;
              if (familyActivitySelection) saveAppSelection(familyActivitySelection);
              setAppSelection({ applicationCount, categoryCount, webDomainCount });
            }}
          />
        )}

        {LOCATION_CHECK_IN && (
          <>
            <SectionHeader title="Check-in" />
            <View onLayout={(e) => (checkInY.current = e.nativeEvent.layout.y)}>
              <ListGroup>
                <ListRow icon="location" title="Gym" value={gymLocation?.label ?? 'Not set'} onPress={() => toggleExpanded('gym')} />
                {expanded === 'gym' && (
                  <View style={styles.panel} onLayout={(e) => (gymPanelY.current = e.nativeEvent.layout.y)}>
                    <GymPicker
                      value={gymLocation}
                      onChange={changeGym}
                      onSearchFocus={(y) => scrollRef.current?.scrollTo({ y: checkInY.current + gymPanelY.current + y, animated: true })}
                    />
                  </View>
                )}
                <ListRow
                  icon="radio"
                  title="Check-in radius"
                  subtitle="How close counts as there"
                  value={`${checkInRadiusMeters} m`}
                  onPress={() => toggleExpanded('radius')}
                />
                {expanded === 'radius' && (
                  <View style={styles.panel}>
                    <Stepper
                      value={`${checkInRadiusMeters} m`}
                      onDecrement={() => setCheckInRadiusMeters(Math.max(RADIUS_MIN, checkInRadiusMeters - RADIUS_STEP))}
                      onIncrement={() => setCheckInRadiusMeters(Math.min(RADIUS_MAX, checkInRadiusMeters + RADIUS_STEP))}
                    />
                  </View>
                )}
              </ListGroup>
            </View>
          </>
        )}

        <SectionHeader title="Account" />
        <ListGroup>
          <ListRow icon="log-out-outline" title="Sign out" subtitle={signedInAs} destructive showChevron={false} onPress={confirmSignOut} />
          {isAuthenticated && !bypassed && (
            <ListRow
              icon="trash-outline"
              title={deleting ? 'Deleting\u2026' : 'Delete account'}
              subtitle="Removes your profile, buddies and history"
              destructive
              showChevron={false}
              onPress={deleting ? undefined : confirmDelete}
            />
          )}
        </ListGroup>

        {__DEV__ && (
          <>
            <SectionHeader title="Developer" />
            <ListGroup>
              <ListRow
                icon="flask"
                tone="neutral"
                title="Lock now (test)"
                subtitle="Shields your picked apps immediately"
                onPress={() => {
                  lockNowForTesting();
                  Alert.alert('Sent', 'Tried locking your selected apps now, bypassing the schedule.');
                }}
              />
            </ListGroup>
          </>
        )}

        <Text style={styles.about}>GymBuddy 1.0.0 · gymbuddy.live</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ value, onDecrement, onIncrement }: { value: string; onDecrement: () => void; onIncrement: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperButton} onPress={onDecrement} accessibilityRole="button" accessibilityLabel="Decrease">
        <Ionicons name="remove" size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={onIncrement} accessibilityRole="button" accessibilityLabel="Increase">
        <Ionicons name="add" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.md + 4, paddingBottom: spacing.xxl },
  topBar: { paddingVertical: spacing.sm },
  title: { color: colors.text, ...type.display, marginTop: spacing.xs },
  panel: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  hiddenAnchor: { width: 1, height: 1, position: 'absolute' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  stepperButton: {
    width: 48,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { color: colors.text, ...type.numeralM },
  about: { color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xl },
});
