import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DeviceActivitySelectionSheetView } from 'react-native-device-activity';
import { Button } from '../components/Button';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import {
  hasScreenTimeAuthorization,
  requestScreenTimeAuthorization,
  saveAppSelection,
} from '../lib/screenTime';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingApps'>;

export function OnboardingAppsScreen({ navigation }: Props) {
  const appSelection = useAppStore((s) => s.appSelection);
  const setAppSelection = useAppStore((s) => s.setAppSelection);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const hasSelection = !!appSelection && appSelection.applicationCount + appSelection.categoryCount > 0;

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>STEP 1 OF 3</Text>
        <Text style={styles.title}>Pick your weaknesses</Text>
        <Text style={styles.subtitle}>
          Choose the apps that get locked on your gym days. No sneaking in one last scroll.
        </Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.summaryCard, hasSelection && styles.summaryCardSelected]}>
          <View style={styles.summaryIconWrap}>
            <Ionicons
              name={hasSelection ? 'lock-closed' : 'apps-outline'}
              size={24}
              color={hasSelection ? colors.accent : colors.textMuted}
            />
          </View>
          <Text style={styles.summaryTitle}>
            {hasSelection
              ? `${appSelection!.applicationCount} app${appSelection!.applicationCount === 1 ? '' : 's'}${
                  appSelection!.categoryCount > 0 ? ` · ${appSelection!.categoryCount} categories` : ''
                } selected`
              : 'No apps selected yet'}
          </Text>
          <Text style={styles.summarySubtitle}>
            GymBuddy never sees which apps you pick — Apple keeps that private, even from us.
          </Text>
          <Button
            title={hasSelection ? 'Change Selection' : 'Choose Apps to Lock'}
            variant={hasSelection ? 'secondary' : 'primary'}
            loading={requesting}
            onPress={openPicker}
            style={styles.pickButton}
          />
        </View>
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

      <View style={styles.footer}>
        <Button title="Continue" disabled={!hasSelection} onPress={() => navigation.navigate('OnboardingSchedule')} />
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
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  summaryCardSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  summaryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  summaryTitle: { color: colors.text, ...type.title, textAlign: 'center' },
  summarySubtitle: {
    color: colors.textMuted,
    ...type.body,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  pickButton: { alignSelf: 'stretch' },
  hiddenAnchor: { width: 1, height: 1, position: 'absolute' },
  footer: { padding: spacing.lg },
});
