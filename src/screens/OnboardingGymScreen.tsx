import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { getCurrentLocation, searchLocation, ResolvedLocation } from '../lib/location';
import { startScreenTimeMonitoring, updateShieldCopy } from '../lib/screenTime';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingGym'>;

export function OnboardingGymScreen({ navigation }: Props) {
  const schedule = useAppStore((s) => s.schedule);
  const setGymLocation = useAppStore((s) => s.setGymLocation);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const graceMinutes = useAppStore((s) => s.graceMinutes);

  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [finishing, setFinishing] = useState(false);

  async function useCurrentLocation() {
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
    setLocation(result);
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const result = await searchLocation(query);
    setSearching(false);

    if (!result) {
      Alert.alert('No match found', "Couldn't find that place. Try a fuller address.");
      return;
    }
    setLocation(result);
  }

  async function finish() {
    if (!location || !schedule) return;

    setFinishing(true);
    setGymLocation(location);
    try {
      await startScreenTimeMonitoring(schedule, graceMinutes);
      updateShieldCopy({ schedule, gymName: location.label, streak: 0 });
    } catch (error) {
      Alert.alert(
        'Could not start locking',
        'Your setup was saved, but GymBuddy could not register it with Screen Time. Try again from Settings.'
      );
      console.warn('startScreenTimeMonitoring failed', error);
    }
    setFinishing(false);

    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>STEP 3 OF 3</Text>
        <Text style={styles.title}>Set your gym</Text>
        <Text style={styles.subtitle}>
          GymBuddy checks you're near this spot when you submit proof. Search for it, or use your current
          location if you're there now.
        </Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.summaryCard, location && styles.summaryCardSelected]}>
          <View style={styles.summaryIconWrap}>
            <Ionicons
              name={location ? 'location' : 'location-outline'}
              size={24}
              color={location ? colors.accent : colors.textMuted}
            />
          </View>
          <Text style={styles.summaryTitle}>{location ? 'Gym location saved' : 'No gym location yet'}</Text>
          <Text style={styles.summarySubtitle}>
            {location ? location.label : "Search below, or use your current location if you're at the gym."}
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search gym name or address"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          <Button title="Search" variant="secondary" loading={searching} onPress={runSearch} style={styles.searchButton} />
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <Button
          title="Use My Current Location"
          variant="secondary"
          loading={locating}
          onPress={useCurrentLocation}
        />
      </View>

      <View style={styles.footer}>
        <Button title="Start Locking In" disabled={!location} loading={finishing} onPress={finish} />
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
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  summaryCardSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryTitle: { color: colors.text, ...type.subtitle, textAlign: 'center' },
  summarySubtitle: {
    color: colors.textMuted,
    ...type.body,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontSize: 17,
  },
  searchButton: { paddingHorizontal: spacing.lg },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, ...type.caption },
  footer: { padding: spacing.lg },
});
