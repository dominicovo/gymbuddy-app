import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { colors, radius, spacing, type } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const HANDLE_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function EditProfileScreen({ navigation }: Props) {
  const fullName = useAuthStore((s) => s.fullName);
  const handle = useAuthStore((s) => s.handle);
  const setCard = useAuthStore((s) => s.setCard);

  const [name, setName] = useState(fullName);
  const [handleValue, setHandleValue] = useState(handle);

  const handleValid = HANDLE_PATTERN.test(handleValue.trim());
  const canSave = name.trim().length > 0 && handleValid;

  function save() {
    if (!canSave) return;
    setCard(name.trim(), handleValue.trim());
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <Pressable onPress={save} disabled={!canSave}>
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFor(name)}</Text>
        </View>
        <Text style={styles.previewName}>{name.trim() || 'Your name'}</Text>
        <Text style={styles.previewHandle}>@{handleValue.trim() || 'handle'}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Full name</Text>
        <View style={styles.inputCard}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Alex Rivera"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Handle</Text>
        <View style={styles.inputCard}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="alexlifts"
            placeholderTextColor={colors.textMuted}
            value={handleValue}
            onChangeText={(t) => setHandleValue(t.replace(/\s/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {handleValid && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Save Changes" disabled={!canSave} onPress={save} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { color: colors.text, ...type.subtitle },
  cancelText: { color: colors.textMuted, fontSize: 17, fontWeight: '600' },
  saveText: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  saveTextDisabled: { color: colors.textMuted },
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
  avatarText: { color: colors.text, fontSize: 20, fontWeight: '800' },
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
  footer: { marginTop: 'auto', paddingTop: spacing.lg },
});
