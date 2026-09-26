import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { DayPicker } from '../components/DayPicker';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { SectionHeader } from '../components/ListGroup';
import { TimeStepper } from '../components/TimeStepper';
import { colors, spacing, type } from '../theme/colors';
import { DayOfWeek } from '../types';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { stepHHMM, windowHours } from '../lib/time';
import { startScreenTimeMonitoring, updateShieldCopy } from '../lib/screenTime';
import { LOCATION_CHECK_IN, SETUP_STEPS } from '../config/features';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingSchedule'>;

export function OnboardingScheduleScreen({ navigation }: Props) {
  const existing = useAppStore((s) => s.schedule);
  const setSchedule = useAppStore((s) => s.setSchedule);
  const graceMinutes = useAppStore((s) => s.graceMinutes);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [finishing, setFinishing] = useState(false);

  const [days, setDays] = useState<DayOfWeek[]>(existing?.days ?? ['Mon', 'Wed', 'Fri']);
  const [windowStart, setWindowStart] = useState(existing?.windowStart ?? '06:00');
  const [windowEnd, setWindowEnd] = useState(existing?.windowEnd ?? '20:00');

  const hours = windowHours(windowStart, windowEnd);
  const valid = days.length > 0 && windowStart !== windowEnd;

  async function next() {
    const schedule = { days, windowStart, windowEnd };
    setSchedule(schedule);
    if (LOCATION_CHECK_IN) {
      navigation.navigate('OnboardingGym');
      return;
    }
    // Last step while check-ins are photo-only: start the locks and go.
    setFinishing(true);
    try {
      await startScreenTimeMonitoring(schedule, graceMinutes);
      updateShieldCopy({ schedule, gymName: null, streak: 0 });
    } catch (error) {
      Alert.alert('Could not start locking', 'Your setup was saved, but Screen Time didn’t accept the schedule. Try again from Settings.');
      console.warn('startScreenTimeMonitoring failed', error);
    }
    setFinishing(false);
    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingHeader
        step={2}
        total={SETUP_STEPS}
        onBack={() => navigation.goBack()}
        title="When do you train?"
        subtitle="On these days, your apps lock when the window opens and stay locked until you check in."
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader title="Gym days" />
        <DayPicker value={days} onChange={setDays} />

        <SectionHeader title="Lock window" />
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

        <Text style={styles.summary}>
          {days.length === 0
            ? 'Pick at least one gym day.'
            : `${days.length} day${days.length === 1 ? '' : 's'} a week · ${hours % 1 === 0 ? hours : hours.toFixed(1)}-hour window. Miss it and the apps unlock when it closes — but your streak resets.`}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {LOCATION_CHECK_IN ? (
          <Button title="Continue" disabled={!valid} onPress={next} />
        ) : (
          <Button title="Start locking in" icon="lock-closed" disabled={!valid} loading={finishing} onPress={next} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  summary: { color: colors.textMuted, ...type.caption, fontSize: 14, lineHeight: 20, marginTop: spacing.md, marginHorizontal: spacing.xs },
  footer: { padding: spacing.lg, paddingTop: spacing.md },
});
