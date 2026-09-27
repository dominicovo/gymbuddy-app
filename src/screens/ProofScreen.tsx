import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { getCurrentLocation } from '../lib/location';
import { distanceInMeters } from '../lib/geo';
import { IoniconName } from '../types';
import { LOCATION_CHECK_IN } from '../config/features';
import { PhotoVerdict, checkGymPhoto } from '../lib/gymPhoto';

type Props = NativeStackScreenProps<RootStackParamList, 'Proof'>;

type Fix =
  | { kind: 'checking' }
  | { kind: 'noGym' }
  | { kind: 'denied' }
  | { kind: 'error' }
  | { kind: 'measured'; meters: number; inRange: boolean };

type PhotoCheck = { kind: 'idle' } | { kind: 'checking' } | PhotoVerdict;

// Strict, never stuck: after this many rejected photos, let them through anyway.
const MISSES_BEFORE_OVERRIDE = 3;

function formatMeters(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function ProofScreen({ navigation }: Props) {
  const submitProof = useAppStore((s) => s.submitProof);
  const gymLocation = useAppStore((s) => s.gymLocation);
  const radiusMeters = useAppStore((s) => s.checkInRadiusMeters);

  const [fix, setFix] = useState<Fix>({ kind: 'checking' });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCheck, setPhotoCheck] = useState<PhotoCheck>({ kind: 'idle' });
  const [misses, setMisses] = useState(0);
  const [overridden, setOverridden] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newStreak, setNewStreak] = useState<number | null>(null);

  const measure = useCallback(async (): Promise<Fix> => {
    if (!gymLocation) return { kind: 'noGym' };
    setFix({ kind: 'checking' });
    let next: Fix;
    try {
      const here = await getCurrentLocation();
      if (!here) {
        next = { kind: 'denied' };
      } else {
        const meters = distanceInMeters(here, gymLocation);
        next = { kind: 'measured', meters, inRange: meters <= radiusMeters };
      }
    } catch (error) {
      console.warn('getCurrentLocation failed', error);
      next = { kind: 'error' };
    }
    setFix(next);
    return next;
  }, [gymLocation, radiusMeters]);

  useEffect(() => {
    if (LOCATION_CHECK_IN) void measure();
  }, [measure]);

  async function usePhoto(uri: string) {
    setPhotoUri(uri);
    setOverridden(false);
    setPhotoCheck({ kind: 'checking' });
    const verdict = await checkGymPhoto(uri);
    setPhotoCheck(verdict);
    if (verdict.kind === 'notGym' || verdict.kind === 'screen') setMisses((m) => m + 1);
  }

  // The simulator has no camera; lets the photo check be tried with library images.
  async function pickFromLibraryDev() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets[0]) await usePhoto(result.assets[0].uri);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access for GymBuddy in Settings to take your check-in photo.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (!result.canceled && result.assets[0]) await usePhoto(result.assets[0].uri);
    } catch (error) {
      console.warn('launchCameraAsync failed', error);
      Alert.alert('Camera unavailable', 'This device has no camera GymBuddy can use.');
    }
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    if (LOCATION_CHECK_IN) {
      // A fresh fix at the moment of submitting — the one from opening the screen may be stale.
      const latest = await measure();
      if (latest.kind !== 'measured' || !latest.inRange) {
        setSubmitting(false);
        return;
      }
    }
    const streak = submitProof();
    setSubmitting(false);
    setNewStreak(streak);
  }

  if (newStreak !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.success}>
          <View style={styles.successBadge}>
            <Ionicons name="lock-open" size={34} color={colors.success} />
          </View>
          <Text style={styles.successEyebrow}>CHECKED IN</Text>
          <View style={styles.successNumeralRow}>
            <Text style={styles.successDay}>DAY</Text>
            <Text style={styles.successNumeral}>{newStreak}</Text>
          </View>
          <Text style={styles.successBody}>Your apps are unlocked for the rest of today. Go get it.</Text>
        </View>
        <View style={styles.footer}>
          <Button title="Done" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const status = describeFix(fix, gymLocation?.label ?? 'your gym', radiusMeters);
  // With photo-only check-ins, there's no location to be "in range" of.
  const inRange = !LOCATION_CHECK_IN || (fix.kind === 'measured' && fix.inRange);
  // No classifier (older app build) or it failed: don't block on our problem.
  const photoOk = photoCheck.kind === 'gym' || photoCheck.kind === 'unavailable' || overridden;
  const rejected = !overridden && (photoCheck.kind === 'notGym' || photoCheck.kind === 'screen');
  const canOverride = rejected && misses >= MISSES_BEFORE_OVERRIDE;
  const ready = inRange && !!photoUri && photoOk;
  const hint = !photoUri
    ? 'Take a photo to continue.'
    : photoCheck.kind === 'checking'
      ? 'Checking your photo…'
      : rejected
        ? canOverride
          ? 'Still not passing? You can use this photo anyway.'
          : 'Retake the photo to continue.'
        : !inRange
          ? 'You need to be at your gym to unlock.'
          : 'Checked on your phone. The photo never leaves it.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel="Close" size={36} />
        <Text style={styles.topTitle}>Check in</Text>
        <View style={styles.topSpacer} />
      </View>

      {LOCATION_CHECK_IN && (
        <View style={[styles.status, { backgroundColor: status.bg }]}>
          <View style={styles.statusIcon}>
            {fix.kind === 'checking' ? (
              <ActivityIndicator color={status.fg} />
            ) : (
              <Ionicons name={status.icon} size={22} color={status.fg} />
            )}
          </View>
          <View style={styles.statusText}>
            <Text style={[styles.statusTitle, { color: status.fg }]}>{status.title}</Text>
            <Text style={styles.statusBody}>{status.body}</Text>
          </View>
          {status.action ? (
            <Pressable
              onPress={
                status.action === 'settings'
                  ? () => Linking.openSettings()
                  : status.action === 'gym'
                    ? () => navigation.navigate('Settings')
                    : () => void measure()
              }
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[styles.statusAction, { color: status.fg }]}>
                {status.action === 'settings' ? 'Settings' : status.action === 'gym' ? 'Set gym' : 'Retry'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <Pressable
        style={({ pressed }) => [styles.photo, pressed && !photoUri && styles.photoPressed]}
        onPress={photoUri ? undefined : takePhoto}
        accessibilityRole={photoUri ? undefined : 'button'}
        accessibilityLabel={photoUri ? 'Your check-in photo' : 'Take a gym photo'}
      >
        {photoUri ? (
          <>
            <Image source={{ uri: photoUri }} style={styles.photoImage} />
            <PhotoBadge check={photoCheck} overridden={overridden} />
            <Pressable
              style={styles.retake}
              onPress={takePhoto}
              accessibilityRole="button"
              accessibilityLabel="Retake photo"
            >
              <Ionicons name="camera-reverse" size={16} color={colors.text} />
              <Text style={styles.retakeText}>Retake</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.photoEmpty}>
            <View style={styles.cameraCircle}>
              <Ionicons name="camera" size={30} color={colors.accent} />
            </View>
            <Text style={styles.photoTitle}>Take a gym photo</Text>
            <Text style={styles.photoBody}>
              The rack, your kit, the view from the treadmill — anything that says you showed up.
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.footer}>
        {rejected && !canOverride ? (
          <Button title="Retake photo" icon="camera-reverse" onPress={takePhoto} />
        ) : (
          <Button title="Unlock my apps" icon="lock-open" disabled={!ready} loading={submitting} onPress={submit} />
        )}
        <Text style={styles.hint}>{hint}</Text>
        {__DEV__ && (
          <Pressable onPress={pickFromLibraryDev} hitSlop={8} accessibilityRole="button" style={styles.override}>
            <Text style={styles.overrideText}>Pick from library (dev only)</Text>
          </Pressable>
        )}
        {canOverride && (
          <Pressable onPress={() => setOverridden(true)} hitSlop={8} accessibilityRole="button" style={styles.override}>
            <Text style={styles.overrideText}>Use this photo anyway</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function PhotoBadge({ check, overridden }: { check: PhotoCheck; overridden: boolean }) {
  if (check.kind === 'idle' || check.kind === 'unavailable') return null;
  if (check.kind === 'checking') {
    return (
      <View style={[styles.badge, styles.badgeNeutral]}>
        <ActivityIndicator color={colors.text} size="small" />
        <Text style={styles.badgeTitle}>Checking your photo…</Text>
      </View>
    );
  }
  if (check.kind === 'gym' || overridden) {
    return (
      <View style={[styles.badge, styles.badgeOk]}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <Text style={styles.badgeTitle}>{overridden ? 'Using this photo' : 'Looks like a gym'}</Text>
      </View>
    );
  }
  const screen = check.kind === 'screen';
  return (
    <View style={[styles.badge, styles.badgeBad]}>
      <Ionicons name={screen ? 'tv-outline' : 'alert-circle'} size={20} color={colors.danger} />
      <View style={styles.badgeText}>
        <Text style={styles.badgeTitle}>{screen ? 'That looks like a screen' : 'This doesn’t look like a gym'}</Text>
        <Text style={styles.badgeBody}>
          {screen
            ? 'Take the photo at the gym, not of a photo on a screen.'
            : 'Get some kit in the shot: a rack, weights, a bench or machines.'}
        </Text>
      </View>
    </View>
  );
}

function describeFix(
  fix: Fix,
  gymName: string,
  radiusMeters: number
): { title: string; body: string; icon: IoniconName; fg: string; bg: string; action?: 'retry' | 'settings' | 'gym' } {
  switch (fix.kind) {
    case 'checking':
      return {
        title: 'Finding you…',
        body: `Checking you're at ${gymName}`,
        icon: 'locate',
        fg: colors.textMuted,
        bg: colors.surface,
      };
    case 'noGym':
      return {
        title: 'No gym set',
        body: 'Set your gym so GymBuddy knows where to check.',
        icon: 'location-outline',
        fg: colors.warning,
        bg: colors.warningMuted,
        action: 'gym',
      };
    case 'denied':
      return {
        title: 'Location is off',
        body: 'Allow location for GymBuddy to check in.',
        icon: 'navigate-circle-outline',
        fg: colors.danger,
        bg: colors.dangerMuted,
        action: 'settings',
      };
    case 'error':
      return {
        title: "Couldn't get a fix",
        body: 'Step near a window or outside and retry.',
        icon: 'cloud-offline-outline',
        fg: colors.warning,
        bg: colors.warningMuted,
        action: 'retry',
      };
    case 'measured':
      return fix.inRange
        ? {
            title: "You're at the gym",
            body: `${gymName} · ${formatMeters(fix.meters)}`,
            icon: 'checkmark-circle',
            fg: colors.success,
            bg: colors.successMuted,
          }
        : {
            title: `${formatMeters(fix.meters)} from your gym`,
            body: `Get within ${radiusMeters} m of ${gymName}.`,
            icon: 'walk',
            fg: colors.warning,
            bg: colors.warningMuted,
            action: 'retry',
          };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md + 4 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  topTitle: { color: colors.text, ...type.subtitle },
  topSpacer: { width: 36 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  statusIcon: { width: 28, alignItems: 'center' },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 17, fontWeight: '700' },
  statusBody: { color: colors.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  statusAction: { fontSize: 15, fontWeight: '700' },
  photo: {
    flex: 1,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  photoPressed: { backgroundColor: colors.surfaceAlt },
  photoImage: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  cameraCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  photoTitle: { color: colors.text, ...type.subtitle, fontSize: 19 },
  photoBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  retake: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 7, 12, 0.72)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retakeText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  badge: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  badgeNeutral: { backgroundColor: 'rgba(8, 7, 12, 0.82)', borderColor: colors.borderStrong },
  badgeOk: { backgroundColor: 'rgba(12, 23, 17, 0.9)', borderColor: colors.successBorder },
  badgeBad: { backgroundColor: 'rgba(8, 7, 12, 0.9)', borderColor: colors.danger },
  badgeText: { flex: 1 },
  badgeTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  badgeBody: { color: colors.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  override: { alignSelf: 'center', paddingVertical: spacing.xs },
  overrideText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  footer: { paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  successBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successEyebrow: { color: colors.success, ...type.eyebrow },
  successNumeralRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: spacing.sm },
  successDay: { color: colors.textMuted, fontFamily: type.numeralM.fontFamily, fontSize: 34, marginBottom: 18 },
  successNumeral: { color: colors.text, ...type.numeralXL, fontSize: 120, lineHeight: 120 },
  successBody: { color: colors.textMuted, ...type.body, textAlign: 'center', marginTop: spacing.sm, maxWidth: 300 },
});
