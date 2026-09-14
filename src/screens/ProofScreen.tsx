import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { colors, radius, spacing, type } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation/types';
import { getCurrentLocation } from '../lib/location';
import { distanceInMeters } from '../lib/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'Proof'>;

type Status = 'idle' | 'checkingLocation' | 'verifying' | 'verified';

export function ProofScreen({ navigation }: Props) {
  const submitProof = useAppStore((s) => s.submitProof);
  const gymLocation = useAppStore((s) => s.gymLocation);
  const checkInRadiusMeters = useAppStore((s) => s.checkInRadiusMeters);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'GymBuddy needs your camera to verify your gym proof.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function submit() {
    if (!gymLocation) {
      Alert.alert('No gym location saved', 'Set your gym location in Settings before submitting proof.');
      return;
    }

    setStatus('checkingLocation');

    let here;
    try {
      here = await getCurrentLocation();
    } catch (error) {
      console.warn('getCurrentLocation failed', error);
      Alert.alert('Could not get your location', 'Make sure Location Services are on and try again.');
      setStatus('idle');
      return;
    }

    if (!here) {
      Alert.alert(
        'Location access needed',
        'GymBuddy needs your location to confirm you actually showed up. You can allow this under Settings › Privacy › Location Services.'
      );
      setStatus('idle');
      return;
    }

    const distance = distanceInMeters(here, gymLocation);
    if (distance > checkInRadiusMeters) {
      Alert.alert(
        "You're not there yet",
        `You look to be about ${Math.round(distance)}m from your gym. Get a bit closer and try again.`
      );
      setStatus('idle');
      return;
    }

    setStatus('verifying');
    setTimeout(() => {
      submitProof();
      setStatus('verified');
      setTimeout(() => navigation.navigate('Main'), 900);
    }, 900);
  }

  const busy = status === 'checkingLocation' || status === 'verifying';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prove It</Text>
        <Text style={styles.subtitle}>Snap a photo at the gym. Verified in seconds, apps unlocked right after.</Text>
      </View>

      <View style={styles.photoBox}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        )}

        {status === 'checkingLocation' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Checking your location…</Text>
          </View>
        )}
        {status === 'verifying' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Verifying…</Text>
          </View>
        )}
        {status === 'verified' && (
          <View style={styles.overlay}>
            <Ionicons name="checkmark-circle" size={18} color={colors.textOnAccent} />
            <Text style={styles.overlayText}>Proof submitted</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {!photoUri ? (
          <Button title="Open Camera" onPress={takePhoto} />
        ) : (
          <>
            <Button title="Retake" variant="secondary" onPress={() => setPhotoUri(null)} style={styles.retake} disabled={busy} />
            <Button title="Submit Proof" onPress={submit} loading={busy} disabled={status !== 'idle'} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  title: { color: colors.text, ...type.display },
  subtitle: { color: colors.textMuted, ...type.body, marginTop: spacing.sm },
  photoBox: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: 'rgba(38,36,32,0.85)',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { color: colors.textOnAccent, fontWeight: '700', fontSize: 17 },
  footer: { marginTop: spacing.lg, gap: spacing.sm },
  retake: { marginBottom: spacing.xs },
});
