import React, { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { colors, radius, spacing, type } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Photo changes are staged like the text fields, and only applied on Save. */
type PhotoEdit = { kind: 'keep' } | { kind: 'new'; uri: string } | { kind: 'remove' };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.4,
};

export function EditProfileScreen({ navigation }: Props) {
  const fullName = useAuthStore((s) => s.fullName);
  const handle = useAuthStore((s) => s.handle);
  const setCard = useAuthStore((s) => s.setCard);
  const avatarUrl = useAuthStore((s) => s.avatarUrl);
  const setAvatar = useAuthStore((s) => s.setAvatar);
  const removeAvatar = useAuthStore((s) => s.removeAvatar);

  const [name, setName] = useState(fullName);
  const [handleValue, setHandleValue] = useState(handle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PhotoEdit>({ kind: 'keep' });

  const previewUri = photo.kind === 'new' ? photo.uri : photo.kind === 'remove' ? null : avatarUrl;
  const handleValid = HANDLE_PATTERN.test(handleValue);
  const cardChanged = name.trim() !== fullName || handleValue !== handle;
  const changed = cardChanged || photo.kind !== 'keep';
  const canSave = name.trim().length > 0 && handleValid && changed && !saving;

  async function pick(source: 'camera' | 'library') {
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access for GymBuddy in Settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ ...PICKER_OPTIONS, cameraType: ImagePicker.CameraType.front })
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (!result.canceled && result.assets[0]) setPhoto({ kind: 'new', uri: result.assets[0].uri });
    } catch (e) {
      console.warn('image picker failed', e);
      Alert.alert(source === 'camera' ? 'Camera unavailable' : 'Photos unavailable', 'Try the other option.');
    }
  }

  function choosePhoto() {
    const hasPhoto = !!previewUri;
    const options = ['Take photo', 'Choose from library', ...(hasPhoto ? ['Remove photo'] : []), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Profile photo',
        message: 'Your buddies see this next to your check-ins.',
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: hasPhoto ? options.indexOf('Remove photo') : undefined,
      },
      (index) => {
        const choice = options[index];
        if (choice === 'Take photo') void pick('camera');
        else if (choice === 'Choose from library') void pick('library');
        else if (choice === 'Remove photo') setPhoto({ kind: 'remove' });
      }
    );
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    if (photo.kind !== 'keep') {
      const result = photo.kind === 'new' ? await setAvatar(photo.uri) : await removeAvatar();
      if (result.error) {
        setSaving(false);
        Alert.alert('Photo not saved', result.error);
        return;
      }
      setPhoto({ kind: 'keep' });
    }

    if (cardChanged) {
      const result = await setCard(name.trim(), handleValue);
      if (result.error) {
        setSaving(false);
        setError(result.taken ? `@${handleValue} is taken — try another.` : result.error);
        return;
      }
    }

    setSaving(false);
    navigation.goBack();
  }

  const handleHint = error
    ? error
    : handleValue.length === 0
      ? 'Letters, numbers and underscores.'
      : !handleValid
        ? '3–20 letters, numbers or underscores.'
        : 'Buddies can find you by this.';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
        <Pressable onPress={save} disabled={!canSave} hitSlop={10} accessibilityRole="button">
          {saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={[styles.save, !canSave && styles.saveDisabled]}>Save</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.preview}>
        <Pressable
          onPress={choosePhoto}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={previewUri ? 'Change profile photo' : 'Add profile photo'}
          style={({ pressed }) => pressed && { opacity: 0.8 }}
        >
          <Avatar name={name.trim() || '?'} seed={handleValue || handle} uri={previewUri} size={104} />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={colors.textOnAccent} />
          </View>
        </Pressable>
        <Pressable onPress={choosePhoto} disabled={saving} hitSlop={8} accessibilityRole="button">
          <Text style={styles.photoAction}>{previewUri ? 'Change photo' : 'Add photo'}</Text>
        </Pressable>
        <Text style={styles.previewName}>{name.trim() || 'Your name'}</Text>
        <Text style={styles.previewHandle}>@{handleValue || 'handle'}</Text>
      </View>

      <Text style={styles.label}>NAME</Text>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          placeholder="Alex Rivera"
          placeholderTextColor={colors.textFaint}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="done"
          accessibilityLabel="Name"
        />
      </View>

      <Text style={styles.label}>HANDLE</Text>
      <View style={[styles.field, error && styles.fieldError]}>
        <Text style={styles.at}>@</Text>
        <TextInput
          style={styles.input}
          placeholder="alexlifts"
          placeholderTextColor={colors.textFaint}
          value={handleValue}
          onChangeText={(t) => {
            setError(null);
            setHandleValue(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel="Handle"
        />
        {handleValid && !error && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
      </View>
      <Text style={[styles.hint, error && { color: colors.danger }]}>{handleHint}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md + 4 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  title: { color: colors.text, ...type.subtitle },
  cancel: { color: colors.textMuted, fontSize: 17 },
  save: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  saveDisabled: { color: colors.textFaint },
  preview: { alignItems: 'center', paddingVertical: spacing.lg },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAction: { color: colors.accent, fontSize: 15, fontWeight: '600', marginTop: spacing.sm + 4 },
  previewName: { color: colors.text, ...type.title, marginTop: spacing.sm },
  previewHandle: { color: colors.textMuted, fontSize: 16, marginTop: 2 },
  label: { color: colors.textMuted, ...type.eyebrow, fontSize: 12, marginTop: spacing.md, marginBottom: spacing.sm, marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  fieldError: { borderColor: colors.danger },
  at: { color: colors.textMuted, fontSize: 17 },
  input: { flex: 1, color: colors.text, fontSize: 17, paddingVertical: spacing.sm + 4 },
  hint: { color: colors.textMuted, ...type.caption, marginTop: spacing.sm, marginLeft: spacing.xs },
});
