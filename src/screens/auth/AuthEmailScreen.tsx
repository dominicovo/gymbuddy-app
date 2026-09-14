import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, radius, spacing, type } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthEmail'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthEmailScreen({ navigation }: Props) {
  const sendEmailCode = useAuthStore((s) => s.sendEmailCode);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);

  const isValid = EMAIL_PATTERN.test(value.trim());
  const showError = touched && value.length > 0 && !isValid;

  async function sendCode() {
    if (!isValid || sending) return;
    setSending(true);
    const email = value.trim();
    const { error } = await sendEmailCode(email);
    setSending(false);
    if (error) {
      Alert.alert('Could not send code', error);
      return;
    }
    navigation.navigate('AuthVerify', { email });
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>EMAIL</Text>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>
          We send a six-digit code. New here or coming back, it's the same step.
        </Text>
      </View>

      <View style={[styles.inputCard, showError && styles.inputCardError]}>
        <Ionicons name="mail-outline" size={18} color={showError ? colors.danger : colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={setValue}
          onBlur={() => setTouched(true)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoFocus
          returnKeyType="send"
          onSubmitEditing={sendCode}
          accessibilityLabel="Email address"
        />
      </View>
      {showError && <Text style={styles.errorText}>That doesn't look like a valid email.</Text>}

      <Text style={styles.termsText}>By continuing you agree to the Terms and Privacy Policy.</Text>

      <View style={styles.footer}>
        <Button title="Send code" disabled={!isValid} loading={sending} onPress={sendCode} />
      </View>
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
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  inputCardError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: 17 },
  errorText: { color: colors.danger, fontSize: 14, marginTop: spacing.xs },
  termsText: { color: colors.textMuted, fontSize: 14, lineHeight: 17, marginTop: spacing.lg },
  footer: { marginTop: 'auto', gap: spacing.md },
});
