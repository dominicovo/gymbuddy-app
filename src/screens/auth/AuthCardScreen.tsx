import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, radius, spacing, type } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthCard'>;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** "Alex Rivera" -> "alexrivera". Empty until there's enough to work with. */
function slugFromName(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return base.length >= 3 ? base : '';
}

function withSuffix(handle: string): string {
  const suffix = String(Math.floor(10 + Math.random() * 990));
  return `${handle.slice(0, 20 - suffix.length)}${suffix}`;
}

export function AuthCardScreen({ navigation }: Props) {
  const prefillName = useAuthStore((s) => s.fullName);
  const setCard = useAuthStore((s) => s.setCard);

  const [name, setName] = useState(prefillName);
  const [handle, setHandle] = useState('');
  const [handleEdited, setHandleEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  // Generated once per screen, so the previewed handle can't change under them.
  const [fallbackHandle] = useState(() => `lifter${Math.floor(100 + Math.random() * 900)}`);

  // Until they touch it themselves, the handle just follows the name.
  const effectiveHandle = handleEdited ? handle : slugFromName(name) || fallbackHandle;
  const canContinue = name.trim().length > 0;

  async function next() {
    if (!canContinue || saving) return;
    setSaving(true);

    let attempt = effectiveHandle;
    let result = await setCard(name.trim(), attempt);
    // A taken handle isn't the user's problem to solve — nudge it and retry.
    for (let i = 0; i < 3 && result.taken; i++) {
      attempt = withSuffix(effectiveHandle);
      result = await setCard(name.trim(), attempt);
    }

    setSaving(false);

    if (result.error) {
      Alert.alert('Could not save', result.error);
      return;
    }
    navigation.navigate('AuthPermissions');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR CARD</Text>
        <Text style={styles.title}>What should buddies call you?</Text>
        <Text style={styles.subtitle}>
          This is all a buddy gets — name, handle and your streak. Never your apps or location.
        </Text>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFor(name)}</Text>
        </View>
        <Text style={styles.previewName}>{name.trim() || 'Your name'}</Text>
        <Text style={styles.previewHandle}>@{effectiveHandle || 'handle'}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Your name</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Alex Rivera"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="done"
            onSubmitEditing={next}
            accessibilityLabel="Your name"
          />
        </View>
      </View>

      {!handleEdited && (
        <Pressable
          onPress={() => {
            setHandle(effectiveHandle);
            setHandleEdited(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Handle will be @${effectiveHandle}. Tap to change.`}
        >
          <Text style={styles.handleToggle}>
            Handle will be @{effectiveHandle} · <Text style={styles.handleToggleAction}>change</Text>
          </Text>
        </Pressable>
      )}

      {handleEdited && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Handle</Text>
          <View style={styles.inputCard}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              placeholder={slugFromName(name) || fallbackHandle}
              placeholderTextColor={colors.textMuted}
              value={handle}
              onChangeText={(t) => setHandle(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              accessibilityLabel="Handle"
            />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Button title="Continue" disabled={!canContinue} loading={saving} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  eyebrow: { color: colors.accent, ...type.eyebrow },
  title: { color: colors.text, ...type.display, marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, ...type.body, marginTop: spacing.sm },
  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  previewName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  previewHandle: { color: colors.textMuted, fontSize: 15, fontWeight: '500', marginTop: 2 },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { color: colors.textMuted, ...type.label, marginBottom: spacing.xs },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  atSign: { color: colors.textMuted, fontSize: 17 },
  input: { flex: 1, color: colors.text, fontSize: 17 },
  handleToggle: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  handleToggleAction: { color: colors.accent, fontWeight: '700' },
  footer: { marginTop: 'auto', paddingTop: spacing.lg },
});
