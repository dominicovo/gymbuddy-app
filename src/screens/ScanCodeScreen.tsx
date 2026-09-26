import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { colors, radius, spacing, type } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { useBuddiesStore } from '../store/useBuddiesStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanCode'>;

const CODE_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

export function ScanCodeScreen({ navigation, route }: Props) {
  const linkCode = route.params?.code && /^\d{4}$/.test(route.params.code) ? route.params.code : null;
  const [code, setCode] = useState(linkCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ name: string; accepted: boolean } | null>(null);
  const requestByCode = useBuddiesStore((s) => s.requestByCode);

  // Arrived from a pair link: the code is already there, so pair right away.
  const submittedLink = useRef(false);
  useEffect(() => {
    if (linkCode && !submittedLink.current) {
      submittedLink.current = true;
      void submit(linkCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkCode]);

  function pressKey(key: string) {
    if (sending || result) return;
    setError(null);
    if (key === 'delete') {
      setCode((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '' || code.length >= CODE_LENGTH) return;
    const next = code + key;
    setCode(next);
    if (next.length === CODE_LENGTH) void submit(next);
  }

  async function submit(value: string) {
    setSending(true);
    const res = await requestByCode(value);
    setSending(false);
    if (res.error) {
      setError(res.error);
      setCode('');
      return;
    }
    setResult({ name: res.name ?? 'your buddy', accepted: !!res.accepted });
  }

  if (result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.result}>
          <View style={styles.resultBadge}>
            <Ionicons name={result.accepted ? 'people' : 'paper-plane'} size={30} color={colors.success} />
          </View>
          <Text style={styles.resultTitle}>
            {result.accepted ? `You’re paired with ${result.name}` : `Request sent to ${result.name}`}
          </Text>
          <Text style={styles.resultBody}>
            {/* Entering the code of someone who already asked *you* pairs instantly. */}
            {result.accepted
              ? 'You’ll each see the other’s gym days, check-ins and streak.'
              : 'They’ll see it under Requests on their Buddies tab.'}
          </Text>
        </View>
        <Button title="Done" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel="Close" size={36} />
        <Text style={styles.topTitle}>Enter their code</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.instructions}>
          {linkCode ? 'Pairing from your buddy\u2019s link\u2026' : 'Ask your buddy for the four digits on their pair card.'}
        </Text>

        <View style={styles.codeRow} accessibilityLabel={`Entered ${code.length} of 4 digits`}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[styles.codeBox, i === code.length && !error && styles.codeBoxActive, error && styles.codeBoxError]}
            >
              <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </View>

        <View style={styles.feedback}>
          {sending ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.key, key === '' && styles.keyHidden, pressed && key !== '' && styles.keyPressed]}
            onPress={() => pressKey(key)}
            disabled={key === ''}
            accessibilityRole={key === '' ? undefined : 'button'}
            accessibilityLabel={key === 'delete' ? 'Delete' : key || undefined}
          >
            {key === 'delete' ? (
              <Ionicons name="backspace-outline" size={24} color={colors.text} />
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
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md + 4, paddingBottom: spacing.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  topTitle: { color: colors.text, ...type.subtitle },
  topSpacer: { width: 36 },
  body: { flex: 1, justifyContent: 'center' },
  instructions: { color: colors.textMuted, ...type.body, textAlign: 'center' },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm + 2, marginTop: spacing.lg },
  codeBox: {
    width: 68,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderColor: colors.accent },
  codeBoxError: { borderColor: colors.danger },
  codeDigit: { color: colors.text, ...type.numeralXL, fontSize: 56, lineHeight: 62 },
  feedback: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  errorText: { color: colors.danger, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  key: {
    width: '31.5%',
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.surfaceRaised },
  keyHidden: { backgroundColor: 'transparent' },
  keyText: { color: colors.text, fontFamily: type.numeralM.fontFamily, fontSize: 30 },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  resultBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  resultTitle: { color: colors.text, ...type.title, textAlign: 'center' },
  resultBody: { color: colors.textMuted, ...type.body, textAlign: 'center', marginTop: spacing.sm },
});
