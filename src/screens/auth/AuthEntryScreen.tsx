import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, radius, spacing, type } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { loadDemo } from '../../dev/demo';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthEntry'>;

export function AuthEntryScreen({ navigation }: Props) {
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const bypassAuth = useAuthStore((s) => s.bypassAuth);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  // Sign in with Apple exists on every supported iPhone, but checking keeps an
  // unusable button off screen on anything that lacks it.
  const [appleAvailable, setAppleAvailable] = useState(true);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  function enter() {
    // Read fresh: signing in may have just reset setup for a different account.
    const done = useAppStore.getState().onboardingComplete;
    navigation.reset({
      index: 0,
      routes: [{ name: done ? 'Main' : 'AuthPermissions' }],
    });
  }

  async function signIn(provider: 'apple' | 'google') {
    if (busy) return;
    setBusy(provider);
    const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    setBusy(null);

    if (result.cancelled) return;
    if (result.error) {
      Alert.alert(
        provider === 'apple' ? 'Apple sign-in didn\u2019t work' : 'Google sign-in didn\u2019t work',
        result.error
      );
      return;
    }
    // Only when the provider gave us no name — otherwise the profile is already complete.
    if (result.needsName) {
      navigation.navigate('AuthCard');
      return;
    }
    enter();
  }

  // App Store screenshots: fill every screen with sample data.
  function loadDemoData() {
    loadDemo();
    enter();
  }

  function skipSignIn() {
    bypassAuth();
    enter();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Image
          source={require('../../../assets/brand/gymbuddy-wordmark.png')}
          style={styles.wordmark}
          resizeMode="contain"
          accessibilityRole="header"
          accessibilityLabel="GymBuddy"
        />
        <Text style={styles.subtitle}>
          Your apps stay locked until you show up. Your streak, schedule and buddies stay in sync on your account.
        </Text>

        <View style={styles.buttonStack}>
          {/*
            A custom Sign in with Apple button rather than Apple's native one: the
            native button sizes its title from its height (~22pt at 52pt tall), so it
            can't match the Google button beside it. Apple's HIG allows custom buttons
            that keep the Apple logo, the system font, black-on-white, and ≥44pt height.
          */}
          {appleAvailable && (
            <Pressable
              style={({ pressed }) => [styles.appleButton, pressed && styles.appleButtonPressed]}
              onPress={() => signIn('apple')}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              {busy === 'apple' ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#000000" style={styles.appleLogo} />
                  <Text style={styles.appleButtonText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.googleButtonPressed]}
            onPress={() => signIn('google')}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {busy === 'google' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={colors.text} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.helperText}>New or returning — one tap either way. No passwords, no codes.</Text>

          {/* Stripped from release builds by the __DEV__ guard. */}
          {__DEV__ && <Button title="Skip sign-in (dev only)" variant="secondary" onPress={skipSignIn} />}
          {__DEV__ && <Button title="Load demo data (dev only)" variant="secondary" onPress={loadDemoData} />}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.privacyText}>
          Apple and Google only share your name and email. GymBuddy never sees which apps you lock.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  // The wordmark cut-out is 1464×167; keep its aspect ratio.
  wordmark: { width: 260, height: 260 * (167 / 1464) },
  subtitle: {
    color: colors.textMuted,
    ...type.body,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  buttonStack: { alignSelf: 'stretch', gap: spacing.sm },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
  },
  appleButtonPressed: { opacity: 0.85 },
  // Nudged up so the logo sits on the text's optical centre, as in Apple's own button.
  appleLogo: { marginTop: -2 },
  appleButtonText: { color: '#000000', fontSize: 17, fontWeight: '700' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  googleButtonPressed: { backgroundColor: colors.surfaceAlt },
  googleButtonText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  footer: { padding: spacing.lg, alignItems: 'center' },
  privacyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
  },
});
