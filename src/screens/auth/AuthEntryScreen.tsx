import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, spacing, type } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthEntry'>;

export function AuthEntryScreen({ navigation }: Props) {
  const bypassAuth = useAuthStore((s) => s.bypassAuth);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  function skipSignIn() {
    bypassAuth();
    navigation.reset({ index: 0, routes: [{ name: onboardingComplete ? 'Main' : 'OnboardingApps' }] });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <View style={styles.iconTile}>
          <Ionicons name="lock-open" size={30} color={colors.accent} />
        </View>
        <Text style={styles.title}>GymBuddy</Text>
        <Text style={styles.subtitle}>
          Your apps stay locked until you show up. Your streak, schedule and buddies stay in sync on your
          account.
        </Text>

        <View style={styles.buttonStack}>
          <Button title="Continue with email" icon="mail" onPress={() => navigation.navigate('AuthEmail')} />
          <Text style={styles.helperText}>
            New or returning — we email you a six-digit code. No password to remember.
          </Text>

          {/* Stripped from release builds by the __DEV__ guard. */}
          {__DEV__ && (
            <Button title="Skip sign-in (dev only)" variant="secondary" onPress={skipSignIn} />
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.privacyText}>
          GymBuddy never sees which apps you lock. Apple keeps that list private, even from us.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '800' },
  subtitle: {
    color: colors.textMuted,
    ...type.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  buttonStack: { alignSelf: 'stretch', gap: spacing.md },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
  },
  footer: { padding: spacing.lg, alignItems: 'center' },
  privacyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 19 },
});
