import React, { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { LargeHeader, ListGroup, ListRow, SectionHeader } from '../components/ListGroup';
import { colors, radius, spacing, type } from '../theme/colors';
import { Buddy, InboxNudge, NudgeKind, useBuddiesStore } from '../store/useBuddiesStore';
import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList, TabScreenProps } from '../navigation/types';
import { dayOfWeek, toISODate } from '../lib/schedule';

type Props = TabScreenProps<'Buddies'>;

type TodayStatus = 'due' | 'in' | 'rest';
type Filter = 'all' | TodayStatus;

/** Order on screen: who still needs a push first, then who made it, then who's off. */
const SECTION_ORDER: TodayStatus[] = ['due', 'in', 'rest'];

const SECTION_META: Record<TodayStatus, { title: string; chip: string; color: string; bulk?: { kind: NudgeKind; label: string } }> = {
  due: { title: 'Still to go', chip: 'To go', color: colors.warning, bulk: { kind: 'nudge', label: 'Nudge all' } },
  in: { title: 'Checked in', chip: 'In', color: colors.success, bulk: { kind: 'cheer', label: 'Cheer all' } },
  rest: { title: 'Rest day', chip: 'Rest', color: colors.textFaint },
};

/** A long rest-day list starts folded away — it needs no action today. */
const COLLAPSE_REST_OVER = 4;
const REQUESTS_PREVIEW = 3;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** A buddy's day, judged in the viewer's own calendar day. */
function statusOf(b: Buddy, today: string, todayDow: string): TodayStatus {
  if (b.lastCheckInDay === today && b.lastCheckedInAt) return 'in';
  if (b.days.includes(todayDow as Buddy['days'][number])) return 'due';
  return 'rest';
}

function inboxLine(n: InboxNudge): string {
  const first = n.fromName.split(' ')[0];
  return n.kind === 'cheer' ? `${first} cheered your check-in` : `${first} nudged you — time to go`;
}

interface Section {
  key: TodayStatus;
  total: number;
  /** User ids in this section still owed today's cheer/nudge. */
  pending: string[];
  data: Buddy[];
}

export function BuddiesScreen({ navigation }: Props) {
  const [busyLink, setBusyLink] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<TodayStatus> | null>(null);
  const [showAllRequests, setShowAllRequests] = useState(false);

  const buddies = useBuddiesStore((s) => s.buddies);
  const invites = useBuddiesStore((s) => s.invites);
  const outgoingPending = useBuddiesStore((s) => s.outgoingPending);
  const loading = useBuddiesStore((s) => s.loading);
  const needsAccount = useBuddiesStore((s) => s.needsAccount);
  const inbox = useBuddiesStore((s) => s.inbox);
  const sentToday = useBuddiesStore((s) => s.sentToday);
  const nudgesReady = useBuddiesStore((s) => s.nudgesReady);
  const load = useBuddiesStore((s) => s.load);
  const subscribe = useBuddiesStore((s) => s.subscribe);
  const accept = useBuddiesStore((s) => s.accept);
  const decline = useBuddiesStore((s) => s.decline);
  const remove = useBuddiesStore((s) => s.remove);
  const sendNudge = useBuddiesStore((s) => s.sendNudge);
  const sendNudges = useBuddiesStore((s) => s.sendNudges);
  const markInboxSeen = useBuddiesStore((s) => s.markInboxSeen);
  const signOut = useAuthStore((s) => s.signOut);

  useFocusEffect(
    React.useCallback(() => {
      void load();
      return subscribe();
    }, [load, subscribe])
  );

  const today = toISODate(new Date());
  const todayDow = dayOfWeek(new Date());

  // Group once per data change: status buckets, each in the order that matters for it.
  const groups = useMemo(() => {
    const out: Record<TodayStatus, Buddy[]> = { due: [], in: [], rest: [] };
    for (const b of buddies) out[statusOf(b, today, todayDow)].push(b);
    out.due.sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name)); // biggest streak at risk first
    out.in.sort((a, b) => (b.lastCheckedInAt ?? '').localeCompare(a.lastCheckedInAt ?? '')); // latest arrivals first
    out.rest.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [buddies, today, todayDow]);

  // Default: fold a long rest-day list. Once the user toggles anything, their choice sticks.
  const collapsedSet = collapsed ?? new Set<TodayStatus>(groups.rest.length > COLLAPSE_REST_OVER ? ['rest'] : []);

  const needle = query.trim().toLowerCase();
  const matches = (b: Buddy) => !needle || b.name.toLowerCase().includes(needle) || b.handle.toLowerCase().includes(needle);

  const sections: Section[] = SECTION_ORDER.filter((key) => filter === 'all' || filter === key)
    .map((key) => {
      const all = groups[key].filter(matches);
      const kind = SECTION_META[key].bulk?.kind;
      const pending = kind ? all.filter((b) => !sentToday.includes(`${b.userId}:${kind}`)).map((b) => b.userId) : [];
      // Searching or filtering always shows results — folding only applies to the full list.
      const folded = filter === 'all' && !needle && collapsedSet.has(key);
      return { key, total: all.length, pending, data: folded ? [] : all };
    })
    .filter((s) => s.total > 0);

  const gymToday = groups.due.length + groups.in.length;

  function toggleSection(key: TodayStatus) {
    const next = new Set(collapsedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
  }

  async function respond(linkId: string, action: 'accept' | 'decline') {
    setBusyLink(linkId);
    const { error } = action === 'accept' ? await accept(linkId) : await decline(linkId);
    setBusyLink(null);
    if (error) Alert.alert('Something went wrong', error);
  }

  async function send(b: Buddy, kind: NudgeKind) {
    const { error } = await sendNudge(b.userId, kind);
    if (error) Alert.alert(kind === 'cheer' ? 'Cheer not sent' : 'Nudge not sent', error);
  }

  function confirmBulk(section: Section) {
    const bulk = SECTION_META[section.key].bulk;
    if (!bulk || section.pending.length === 0) return;
    const n = section.pending.length;
    const who = `${n} ${n === 1 ? 'buddy' : 'buddies'}`;
    Alert.alert(
      bulk.kind === 'nudge' ? `Nudge ${who}?` : `Cheer ${who}?`,
      bulk.kind === 'nudge'
        ? 'Everyone still to go gets one nudge for today.'
        : 'Everyone who checked in gets one cheer for today.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: bulk.label,
          onPress: async () => {
            const { error } = await sendNudges(section.pending, bulk.kind);
            if (error) Alert.alert('Not sent', error);
          },
        },
      ]
    );
  }

  function confirmRemove(b: Buddy) {
    Alert.alert('Remove buddy?', `You'll stop seeing ${b.name}'s check-ins, and they'll stop seeing yours.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await remove(b.linkId);
          if (error) Alert.alert('Could not remove', error);
        },
      },
    ]);
  }

  function openActions(b: Buddy, status: TodayStatus) {
    const kind = nudgesReady ? SECTION_META[status].bulk?.kind ?? null : null;
    const canSend = kind !== null && !sentToday.includes(`${b.userId}:${kind}`);
    const options = [...(canSend ? [kind === 'cheer' ? 'Send a cheer' : 'Send a nudge'] : []), 'Remove buddy', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: b.name,
        message: b.handle ? `@${b.handle} · ${b.streak}-day streak` : undefined,
        options,
        destructiveButtonIndex: options.indexOf('Remove buddy'),
        cancelButtonIndex: options.length - 1,
      },
      (index) => {
        if (options[index] === 'Remove buddy') confirmRemove(b);
        else if (canSend && index === 0) void send(b, kind!);
      }
    );
  }

  function goSignIn() {
    void signOut();
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({ index: 0, routes: [{ name: 'AuthEntry' }] });
  }

  const header = (
    <LargeHeader
      title="Buddies"
      right={<IconButton icon="person-add" tone="accent" onPress={() => navigation.navigate('SharePairCard')} accessibilityLabel="Add a buddy" />}
    />
  );

  if (needsAccount) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.padded}>
          {header}
          <View style={styles.block}>
            <EmptyState
              icon="people"
              title="Sign in to pair up"
              message="Buddies live on your account, so they can see your check-ins from their own phone — and you theirs."
            >
              <Button title="Sign in" onPress={goSignIn} />
            </EmptyState>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const visibleInvites = showAllRequests ? invites : invites.slice(0, REQUESTS_PREVIEW);

  const listHeader = (
    <View>
      {header}

      {buddies.length > 0 && (
        <TodaySummary inCount={groups.in.length} dueCount={groups.due.length} restCount={groups.rest.length} gymToday={gymToday} />
      )}

      {inbox.length > 0 && (
        <View style={styles.inbox}>
          <View style={styles.inboxHeader}>
            <Ionicons name="notifications" size={16} color={colors.accent} />
            <Text style={styles.inboxTitle}>From your buddies</Text>
            <Pressable onPress={() => void markInboxSeen()} hitSlop={8} accessibilityRole="button">
              <Text style={styles.inboxDismiss}>Clear</Text>
            </Pressable>
          </View>
          {inbox.slice(0, 3).map((n) => (
            <View key={n.id} style={styles.inboxRow}>
              <Avatar name={n.fromName} seed={n.fromId} uri={n.fromAvatarUrl} size={26} />
              <Text style={styles.inboxText} numberOfLines={1}>
                {inboxLine(n)}
              </Text>
              <Ionicons
                name={n.kind === 'cheer' ? 'hand-left' : 'megaphone'}
                size={15}
                color={n.kind === 'cheer' ? colors.success : colors.warning}
              />
            </View>
          ))}
          {inbox.length > 3 && <Text style={styles.inboxMore}>and {inbox.length - 3} more</Text>}
        </View>
      )}

      {invites.length > 0 && (
        <>
          <SectionHeader
            title={`Requests · ${invites.length}`}
            action={invites.length > REQUESTS_PREVIEW ? (showAllRequests ? 'Show fewer' : `Show all ${invites.length}`) : undefined}
            onAction={() => setShowAllRequests((v) => !v)}
          />
          <ListGroup>
            {visibleInvites.map((inv) => (
              <ListRow
                key={inv.linkId}
                title={inv.name}
                subtitle={inv.handle ? `@${inv.handle}` : 'Wants to pair'}
                leading={<Avatar name={inv.name} seed={inv.handle} size={38} />}
                trailing={
                  <View style={styles.inviteActions}>
                    <Pressable
                      style={styles.declineButton}
                      onPress={() => respond(inv.linkId, 'decline')}
                      disabled={busyLink === inv.linkId}
                      accessibilityRole="button"
                      accessibilityLabel={`Decline ${inv.name}`}
                    >
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() => respond(inv.linkId, 'accept')}
                      disabled={busyLink === inv.linkId}
                      accessibilityRole="button"
                      accessibilityLabel={`Accept ${inv.name}`}
                    >
                      {busyLink === inv.linkId ? (
                        <ActivityIndicator color={colors.textOnAccent} size="small" />
                      ) : (
                        <Text style={styles.acceptText}>Accept</Text>
                      )}
                    </Pressable>
                  </View>
                }
              />
            ))}
          </ListGroup>
        </>
      )}

      {buddies.length > 0 && (
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${buddies.length} buddies`}
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search buddies"
          />
        </View>
      )}

      {buddies.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
          <Chip label="All" count={buddies.length} active={filter === 'all'} onPress={() => setFilter('all')} />
          {SECTION_ORDER.map((key) => (
            <Chip
              key={key}
              label={SECTION_META[key].chip}
              count={groups[key].length}
              dot={SECTION_META[key].color}
              active={filter === key}
              onPress={() => setFilter(filter === key ? 'all' : key)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const listEmpty =
    loading && buddies.length === 0 ? (
      <ActivityIndicator color={colors.textMuted} style={styles.loader} />
    ) : buddies.length === 0 ? (
      <View style={styles.block}>
        <EmptyState
          icon="barbell"
          title="Train with someone"
          message="Pair with a friend who'll notice when you skip. You'll see each other's check-ins and streaks — never your apps or location."
        >
          <Button title="Share my pair code" icon="share-outline" onPress={() => navigation.navigate('SharePairCard')} />
          <Button title="Enter their code" variant="secondary" onPress={() => navigation.navigate('ScanCode')} />
        </EmptyState>
      </View>
    ) : (
      <Text style={styles.noMatches}>
        {needle ? `No buddies match “${query.trim()}”.` : 'Nobody here right now.'}
      </Text>
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList<Buddy, Section>
        sections={sections}
        keyExtractor={(b) => b.linkId}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          outgoingPending > 0 ? (
            <Text style={styles.pendingNote}>
              {outgoingPending} request{outgoingPending === 1 ? '' : 's'} sent · waiting for them to accept
            </Text>
          ) : null
        }
        initialNumToRender={20}
        renderSectionHeader={({ section }) => {
          const meta = SECTION_META[section.key];
          const folded = section.data.length === 0;
          const canFold = filter === 'all' && !needle;
          const showBulk = nudgesReady && !!meta.bulk && section.pending.length > 1 && !folded;
          return (
            <View style={styles.sectionHeader}>
              <Pressable
                style={styles.sectionTitleWrap}
                onPress={canFold ? () => toggleSection(section.key) : undefined}
                disabled={!canFold}
                hitSlop={8}
                accessibilityRole={canFold ? 'button' : 'header'}
                accessibilityState={canFold ? { expanded: !folded } : undefined}
                accessibilityLabel={`${meta.title}, ${section.total}`}
              >
                <View style={[styles.sectionDot, { backgroundColor: meta.color }]} />
                <Text style={styles.sectionTitle}>{meta.title.toUpperCase()}</Text>
                <Text style={styles.sectionCount}>{section.total}</Text>
                {canFold && <Ionicons name={folded ? 'chevron-forward' : 'chevron-down'} size={14} color={colors.textFaint} />}
              </Pressable>
              {showBulk && (
                <Pressable onPress={() => confirmBulk(section)} hitSlop={8} accessibilityRole="button">
                  <Text style={[styles.bulkAction, { color: meta.color }]}>
                    {meta.bulk!.label} ({section.pending.length})
                  </Text>
                </Pressable>
              )}
            </View>
          );
        }}
        renderItem={({ item: b, index, section }) => {
          const status = section.key;
          const kind = SECTION_META[status].bulk?.kind ?? null;
          const sent = kind ? sentToday.includes(`${b.userId}:${kind}`) : false;
          const subtitle =
            status === 'in'
              ? `In at ${formatTime(b.lastCheckedInAt!)}`
              : status === 'due'
                ? b.handle
                  ? `@${b.handle}`
                  : 'Not in yet'
                : b.lastCheckInDay
                  ? `Last in ${new Date(b.lastCheckInDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}`
                  : 'Rest day';
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View style={[styles.rowCard, first && styles.rowFirst, last && styles.rowLast]}>
              {!first && <View style={styles.hairline} />}
              <ListRow
                title={b.name}
                subtitle={subtitle}
                leading={<Avatar name={b.name} seed={b.userId} uri={b.avatarUrl} size={38} />}
                onPress={() => openActions(b, status)}
                accessibilityLabel={`${b.name}, ${SECTION_META[status].title}, ${b.streak} day streak`}
                trailing={
                  <View style={styles.rowTrailing}>
                    <View style={styles.streak}>
                      <Ionicons name="flame" size={13} color={b.streak > 0 ? colors.warning : colors.textFaint} />
                      <Text style={[styles.streakText, b.streak === 0 && { color: colors.textFaint }]}>{b.streak}</Text>
                    </View>
                    {kind && nudgesReady ? (
                      <Pressable
                        onPress={() => void send(b, kind)}
                        disabled={sent}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={sent ? 'Sent' : kind === 'cheer' ? `Cheer ${b.name}` : `Nudge ${b.name}`}
                        style={({ pressed }) => [
                          styles.action,
                          { backgroundColor: sent ? colors.surfaceAlt : kind === 'cheer' ? colors.successMuted : colors.warningMuted },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Ionicons
                          name={sent ? 'checkmark' : kind === 'cheer' ? 'hand-left' : 'megaphone'}
                          size={15}
                          color={sent ? colors.textMuted : kind === 'cheer' ? colors.success : colors.warning}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                }
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

/** The whole day at a glance: who's in, who's still to go, who's off. */
function TodaySummary({ inCount, dueCount, restCount, gymToday }: { inCount: number; dueCount: number; restCount: number; gymToday: number }) {
  const total = inCount + dueCount + restCount;
  return (
    <View
      style={styles.summary}
      accessible
      accessibilityLabel={`${inCount} of ${gymToday} buddies in today, ${dueCount} still to go, ${restCount} resting`}
    >
      <View style={styles.summaryTop}>
        <View style={styles.summaryNumerals}>
          <Text style={styles.summaryBig}>{inCount}</Text>
          <Text style={styles.summaryOf}>/ {gymToday}</Text>
        </View>
        <Text style={styles.summaryLabel}>{gymToday === 0 ? 'No one trains today' : 'in today'}</Text>
      </View>
      <View style={styles.bar}>
        {inCount > 0 && <View style={[styles.barSeg, { flex: inCount, backgroundColor: colors.success }]} />}
        {dueCount > 0 && <View style={[styles.barSeg, { flex: dueCount, backgroundColor: colors.warning }]} />}
        {restCount > 0 && <View style={[styles.barSeg, { flex: restCount, backgroundColor: colors.surfaceRaised }]} />}
        {total === 0 && <View style={[styles.barSeg, { flex: 1, backgroundColor: colors.surfaceRaised }]} />}
      </View>
      <View style={styles.legend}>
        <LegendItem color={colors.success} label="Checked in" value={inCount} />
        <LegendItem color={colors.warning} label="Still to go" value={dueCount} />
        <LegendItem color={colors.surfaceRaised} label="Resting" value={restCount} />
      </View>
    </View>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function Chip({ label, count, active, dot, onPress }: { label: string; count: number; active: boolean; dot?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count}`}
    >
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot }]} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      <Text style={[styles.chipCount, active && styles.chipTextActive]}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.md + 4, paddingTop: spacing.md },
  list: { paddingHorizontal: spacing.md + 4, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  block: { marginTop: spacing.lg },
  loader: { marginTop: spacing.xxl },

  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  summaryNumerals: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  summaryBig: { color: colors.text, ...type.numeralL, fontSize: 46, lineHeight: 48 },
  summaryOf: { color: colors.textMuted, fontFamily: type.numeralM.fontFamily, fontSize: 24, marginBottom: 4 },
  summaryLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '600', marginBottom: 7 },
  bar: { flexDirection: 'row', gap: 3, height: 8, marginTop: spacing.sm + 2 },
  barSeg: { borderRadius: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: 4, marginTop: spacing.sm + 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  legendValue: { color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  inbox: {
    marginTop: spacing.md,
    backgroundColor: colors.accentSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  inboxHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inboxTitle: { flex: 1, color: colors.text, ...type.subtitle, fontSize: 16 },
  inboxDismiss: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  inboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  inboxText: { flex: 1, color: colors.text, fontSize: 15 },
  inboxMore: { color: colors.textMuted, ...type.caption, marginLeft: 36 },

  inviteActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  declineButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    minWidth: 72,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  acceptText: { color: colors.textOnAccent, fontSize: 15, fontWeight: '700' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2,
    minHeight: 42,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: spacing.sm },

  chipsWrap: { marginTop: spacing.md, marginHorizontal: -(spacing.md + 4) },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md + 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.text },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipCount: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chipTextActive: { color: colors.background },

  // Sticky — needs the page colour behind it so rows scroll *under* it.
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: colors.textMuted, ...type.eyebrow, fontSize: 12 },
  sectionCount: { color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bulkAction: { fontSize: 14, fontWeight: '700' },

  // Rows render one at a time (virtualised), so each draws its own slice of the rounded group.
  rowCard: { backgroundColor: colors.surface, overflow: 'hidden' },
  rowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginLeft: 68 },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 34, justifyContent: 'flex-end' },
  streakText: { color: colors.text, ...type.numeralS },
  action: { width: 36, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  noMatches: { color: colors.textMuted, ...type.body, textAlign: 'center', marginTop: spacing.xl },
  pendingNote: { color: colors.textMuted, ...type.caption, textAlign: 'center', marginTop: spacing.lg },
});
