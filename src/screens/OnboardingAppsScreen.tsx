import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DeviceActivitySelectionSheetView } from 'react-native-device-activity';
import { Button } from '../components/Button';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { SETUP_STEPS } from '../config/features';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { hasScreenTimeAuthorization, requestScreenTimeAuthorization, saveAppSelection } from '../lib/screenTime';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingApps'>;

export function OnboardingAppsScreen({ navigation }: Props) {
  const appSelection = useAppStore((s) => s.appSelection);
  const setAppSelection = useAppStore((s) => s.setAppSelection);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const apps = appSelection?.applicationCount ?? 0;
  const categories = appSelection?.categoryCount ?? 0;
  const hasSelection = apps + categories > 0;

  async function openPicker() {
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

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingHeader
        step={1}
        total={SETUP_STEPS}
        title="Pick your weaknesses"
        subtitle="These lock on gym days until you check in. No sneaking in one last scroll."
      />

      <View style={styles.body}>
        <View style={[styles.card, hasSelection && styles.cardOn]}>
          <View style={[styles.iconTile, hasSelection && styles.iconTileOn]}>
            <Ionicons name={hasSelection ? 'lock-closed' : 'apps'} size={26} color={hasSelection ? colors.accent : colors.textMuted} />
          </View>
          {hasSelection ? (
            <View style={styles.counts}>
              <Count value={apps} label={apps === 1 ? 'app' : 'apps'} />
              {categories > 0 && <Count value={categories} label={categories === 1 ? 'category' : 'categories'} />}
            </View>
          ) : (
            <Text style={styles.emptyTitle}>Nothing picked yet</Text>
          )}
          <Text style={styles.cardBody}>Apple keeps your list private — GymBuddy only ever sees the count.</Text>
          <Button
            title={hasSelection ? 'Change selection' : 'Choose apps to lock'}
            variant={hasSelection ? 'secondary' : 'primary'}
            loading={requesting}
            onPress={openPicker}
            style={styles.pick}
          />
        </View>
      </View>

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

      <View style={styles.footer}>
        <Button title="Continue" disabled={!hasSelection} onPress={() => navigation.navigate('OnboardingSchedule')} />
        {/* The Screen Time app picker doesn't work on the simulator. Stripped from release builds by __DEV__. */}
        {__DEV__ && !hasSelection && (
          <Button title="Skip app selection (dev only)" variant="secondary" onPress={() => navigation.navigate('OnboardingSchedule')} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.surface },
  cardOn: { backgroundColor: colors.accentSurface, borderColor: colors.accentBorder },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconTileOn: { backgroundColor: colors.accentMuted },
  counts: { flexDirection: 'row', gap: spacing.xl },
  count: { alignItems: 'center' },
  countValue: { color: colors.text, ...type.numeralXL, fontSize: 64, lineHeight: 68 },
  countLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  emptyTitle: { color: colors.text, ...type.title },
  cardBody: { color: colors.textMuted, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: spacing.sm },
  pick: { marginTop: spacing.lg },
  hiddenAnchor: { width: 1, height: 1, position: 'absolute' },
  footer: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
});
