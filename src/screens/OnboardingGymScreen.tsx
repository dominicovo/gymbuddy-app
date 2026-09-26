import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { GymPicker } from '../components/GymPicker';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { colors, spacing } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { ResolvedLocation } from '../lib/location';
import { startScreenTimeMonitoring, updateShieldCopy } from '../lib/screenTime';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingGym'>;

export function OnboardingGymScreen({ navigation }: Props) {
  const schedule = useAppStore((s) => s.schedule);
  const savedGym = useAppStore((s) => s.gymLocation);
  const setGymLocation = useAppStore((s) => s.setGymLocation);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const graceMinutes = useAppStore((s) => s.graceMinutes);
  const radiusMeters = useAppStore((s) => s.checkInRadiusMeters);

  const [location, setLocation] = useState<ResolvedLocation | null>(savedGym);
  const [finishing, setFinishing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function finish() {
    if (!location || !schedule) return;
    setFinishing(true);
    setGymLocation(location);
    try {
      await startScreenTimeMonitoring(schedule, graceMinutes);
      updateShieldCopy({ schedule, gymName: location.label, streak: 0 });
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
        step={3}
        onBack={() => navigation.goBack()}
        title="Where do you train?"
        subtitle={`Search by the gym’s name or address. To check in you’ll need to be within ${radiusMeters} m of it.`}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <GymPicker
          value={location}
          onChange={setLocation}
          // Lift the search box to the top so results show above the keyboard.
          onSearchFocus={(y) => scrollRef.current?.scrollTo({ y: y + spacing.lg - spacing.sm, animated: true })}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Start locking in" icon="lock-closed" disabled={!location} loading={finishing} onPress={finish} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  footer: { padding: spacing.lg, paddingTop: spacing.md },
});
