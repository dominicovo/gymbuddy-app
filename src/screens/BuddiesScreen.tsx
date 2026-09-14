import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { colors, radius, spacing, type } from '../theme/colors';
import { useBuddiesStore } from '../store/useBuddiesStore';
import { TabScreenProps } from '../navigation/types';

type Props = TabScreenProps<'Buddies'>;

export function BuddiesScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const allBuddies = useBuddiesStore((s) => s.buddies);
  const removeBuddy = useBuddiesStore((s) => s.removeBuddy);

  const buddies = allBuddies.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()));

  function confirmRemove(id: string, name: string) {
    Alert.alert('Remove buddy?', `You'll stop seeing ${name}'s check-ins, and they'll stop seeing yours.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeBuddy(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Buddies</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('SharePairCard')}>
          <Ionicons name="add" size={16} color={colors.accent} />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search buddies"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <Pressable
        style={styles.invitesRow}
        onPress={() => Alert.alert('Invites', "You've shared 3 invite links. 1 hasn't been opened yet.")}
      >
        <Ionicons name="paper-plane-outline" size={18} color={colors.text} />
        <Text style={styles.invitesLabel}>Invites</Text>
        <Text style={styles.invitesMeta}>3 shared</Text>
        <View style={styles.invitesBadge}>
          <Text style={styles.invitesBadgeText}>1</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <View style={styles.connectedHeader}>
        <Text style={styles.connectedLabel}>Connected</Text>
        <Text style={styles.connectedCount}>{allBuddies.length} paired</Text>
      </View>
      {buddies.length > 0 && <Text style={styles.connectedHint}>Long-press a buddy to remove them.</Text>}

      <View style={styles.list}>
        {buddies.map((buddy) => {
          const checkedIn = !!buddy.checkedInAt;
          return (
            <Pressable
              key={buddy.id}
              style={styles.buddyRow}
              onLongPress={() => confirmRemove(buddy.id, buddy.name)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{buddy.initials}</Text>
              </View>
              <View style={styles.buddyTextWrap}>
                <Text style={styles.buddyName}>{buddy.name}</Text>
                <View style={styles.buddyStatusRow}>
                  <Ionicons
                    name={checkedIn ? 'checkmark-circle' : 'time-outline'}
                    size={13}
                    color={checkedIn ? colors.success : colors.danger}
                  />
                  <Text style={styles.buddyStatus}>{checkedIn ? `In at ${buddy.checkedInAt}` : 'Not in yet'}</Text>
                </View>
              </View>
              <View style={styles.streakWrap}>
                <Ionicons name="flame" size={14} color={colors.accent} />
                <Text style={styles.streakText}>{buddy.streak}</Text>
              </View>
              <Pressable
                style={styles.actionButton}
                onPress={() =>
                  Alert.alert(checkedIn ? 'High five sent!' : 'Reminder sent!', `${buddy.name} will see it.`)
                }
              >
                <Ionicons name={checkedIn ? 'hand-left-outline' : 'notifications-outline'} size={16} color={colors.text} />
              </Pressable>
            </Pressable>
          );
        })}
      </View>

      {buddies.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptySubtitle}>Try a different search, or invite someone new.</Text>
          <Button title="Share Pair Code" onPress={() => navigation.navigate('SharePairCard')} style={styles.emptyButton} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, ...type.display },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  addButtonText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 17 },
  invitesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  invitesLabel: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  invitesMeta: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  invitesBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  invitesBadgeText: { color: colors.textOnAccent, fontSize: 13, fontWeight: '800' },
  connectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  connectedLabel: { color: colors.text, ...type.subtitle },
  connectedCount: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  connectedHint: { color: colors.textMuted, ...type.caption, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  buddyTextWrap: { flex: 1 },
  buddyName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  buddyStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  buddyStatus: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  streakWrap: { flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: spacing.sm },
  streakText: { color: colors.text, fontSize: 17, fontWeight: '800' },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { color: colors.text, ...type.subtitle, marginTop: spacing.sm },
  emptySubtitle: { color: colors.textMuted, ...type.caption, textAlign: 'center' },
  emptyButton: { marginTop: spacing.md, alignSelf: 'stretch' },
});
