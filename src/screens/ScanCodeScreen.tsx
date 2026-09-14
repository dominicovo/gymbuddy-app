import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radius, spacing } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { useBuddiesStore } from '../store/useBuddiesStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanCode'>;

const dark = {
  background: '#121118',
  surface: '#1C1B24',
  border: '#33313D',
  text: '#F5F4F8',
  textMuted: '#8E8B9C',
  accent: '#8B84F0',
};

const CODE_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

// Prototype-only: there's no backend to look up who a scanned code or QR
// actually belongs to, so a simulated pairing gets a plausible stand-in name.
const STAND_IN_NAMES = ['Jordan Blake', 'Sam Okafor', 'Riley Chen', 'Taylor Novak'];

export function ScanCodeScreen({ navigation }: Props) {
  const [code, setCode] = useState('');
  const addBuddy = useBuddiesStore((s) => s.addBuddy);

  function pressKey(key: string) {
    if (key === 'delete') {
      setCode((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '' || code.length >= CODE_LENGTH) return;
    const next = code + key;
    setCode(next);
    if (next.length === CODE_LENGTH) {
      simulatePairing();
    }
  }

  function simulatePairing() {
    const name = STAND_IN_NAMES[Math.floor(Math.random() * STAND_IN_NAMES.length)];
    const buddy = addBuddy(name);
    Alert.alert('Paired!', `You and ${buddy.name} are now buddies. They'll see your gym days, window and streak.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color={dark.text} />
        </Pressable>
        <Text style={styles.title}>Pair with a buddy</Text>
        <View style={styles.closeButton} />
      </View>

      <Pressable style={styles.viewfinder} onPress={simulatePairing}>
        <View style={styles.viewfinderInner}>
          <Ionicons name="qr-code-outline" size={64} color={dark.textMuted} />
          <Text style={styles.viewfinderText}>Tap to simulate a scan</Text>
        </View>
      </Pressable>

      <Text style={styles.instructions}>
        Point the camera at a buddy's QR, or type the four digits on their card.
      </Text>

      <View style={styles.codeRow}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.codeBox, i === code.length && styles.codeBoxActive]}>
            <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            style={[styles.key, key === '' && styles.keyHidden]}
            onPress={() => pressKey(key)}
            disabled={key === ''}
          >
            {key === 'delete' ? (
              <Ionicons name="backspace-outline" size={20} color={dark.text} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.background, padding: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: dark.text, fontSize: 18, fontWeight: '700' },
  viewfinder: {
    marginTop: spacing.xl,
    backgroundColor: dark.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderInner: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  viewfinderText: { color: dark.textMuted, fontSize: 16, fontWeight: '600' },
  instructions: {
    color: dark.textMuted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.lg,
  },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  codeBox: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderColor: dark.accent },
  codeDigit: { color: dark.text, fontSize: 26, fontWeight: '800' },
  keypad: {
    marginTop: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  key: {
    width: 106,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHidden: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { color: dark.text, fontSize: 22, fontWeight: '700' },
});
