import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { TimeStepper } from '../components/TimeStepper';
import { colors, spacing, type } from '../theme/colors';
import { ALL_DAYS, DayOfWeek } from '../types';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { stepHHMM } from '../lib/time';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingSchedule'>;

export function OnboardingScheduleScreen({ navigation }: Props) {
  const setSchedule = useAppStore((s) => s.setSchedule);

  const [days, setDays] = useState<DayOfWeek[]>(['Mon', 'Wed', 'Fri']);
  const [windowStart, setWindowStart] = useState('06:00');
  const [windowEnd, setWindowEnd] = useState('20:00');

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function next() {
    setSchedule({ days, windowStart, windowEnd });
    navigation.navigate('OnboardingGym');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>STEP 2 OF 3</Text>
        <Text style={styles.title}>Set your schedule</Text>
        <Text style={styles.subtitle}>
          Pick your gym days and lock window. Apps lock the moment that window opens.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Gym days</Text>
        <View style={styles.dayRow}>
          {ALL_DAYS.map((day) => (
            <Chip key={day} label={day} selected={days.includes(day)} onPress={() => toggleDay(day)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Lock window</Text>
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
      </View>

      <View style={styles.footer}>
        <Button title="Continue" disabled={days.length === 0} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.md },
  eyebrow: { color: colors.accent, ...type.eyebrow },
  title: { color: colors.text, ...type.display, marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, ...type.body, marginTop: spacing.sm },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionLabel: { color: colors.text, ...type.subtitle, marginBottom: spacing.sm },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  footer: { marginTop: 'auto', padding: spacing.lg },
});
