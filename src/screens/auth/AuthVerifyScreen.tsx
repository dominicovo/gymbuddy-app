import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, type } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthVerify'>;

const CODE_LENGTH = 6;

export function AuthVerifyScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode);
  const sendEmailCode = useAuthStore((s) => s.sendEmailCode);
  const completeSignUp = useAuthStore((s) => s.completeSignUp);
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(value: string) {
    setVerifying(true);
    const { error: verifyError, needsProfile } = await verifyEmailCode(email, value);
    setVerifying(false);

    if (verifyError) {
      setError(verifyError);
      setCode('');
      inputRef.current?.focus();
      return;
    }

    if (needsProfile) {
      navigation.navigate('AuthCard');
    } else {
      // Returning account — already set up, so drop straight into the app.
      completeSignUp();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  }

  function onChange(raw: string) {
    if (verifying) return;
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) {
      submit(digits);
    }
  }

  async function resendCode() {
    if (resending) return;
    setResending(true);
    const { error: resendError } = await sendEmailCode(email);
    setResending(false);
    setCode('');
    setError(null);
    if (resendError) {
      Alert.alert('Could not resend code', resendError);
    } else {
      Alert.alert('Code sent', `A new code was sent to ${email}.`);
      inputRef.current?.focus();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>VERIFY</Text>
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>Sent to {email}. It expires in ten minutes.</Text>
      </View>

      <View style={styles.codeWrap}>
        <View style={styles.codeRow} pointerEvents="none">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.codeBox,
                i === code.length && !error && styles.codeBoxActive,
                error && styles.codeBoxError,
              ]}
            >
              <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </View>

        {/* Invisible but real input: lets iOS autofill the emailed code, and
            keeps paste, hardware keyboards and VoiceOver working. */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          editable={!verifying}
          accessibilityLabel="Six digit verification code"
          accessibilityHint="Enter the code sent to your email"
        />
      </View>

      {verifying && <Text style={styles.statusText}>Verifying…</Text>}
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable onPress={resendCode} disabled={resending} accessibilityRole="button">
        <Text style={styles.resendText}>{resending ? 'Sending…' : 'Resend code'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
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
  header: { marginTop: spacing.lg, marginBottom: spacing.lg },
  eyebrow: { color: colors.accent, ...type.eyebrow },
  title: { color: colors.text, ...type.display, marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, ...type.body, marginTop: spacing.sm },
  codeWrap: { position: 'relative' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  codeBox: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderColor: colors.accent },
  codeBoxError: { borderColor: colors.danger },
  codeDigit: { color: colors.text, fontSize: 26, fontWeight: '800' },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: colors.text,
    fontSize: 26,
  },
  statusText: { color: colors.textMuted, fontSize: 15, fontWeight: '600', marginTop: spacing.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  errorText: { color: colors.danger, fontSize: 15, fontWeight: '600', flex: 1 },
  resendText: { color: colors.accent, fontSize: 15, fontWeight: '700', marginTop: spacing.lg },
});
