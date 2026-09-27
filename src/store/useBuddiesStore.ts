import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { DayOfWeek } from '../types';
import { toISODate } from '../lib/schedule';
import { notifyBuddy } from '../lib/push';

export type NudgeKind = 'cheer' | 'nudge';

/** A cheer or nudge a buddy sent you that you haven't seen yet. */
export interface InboxNudge {
  id: string;
  fromName: string;
  fromId: string;
  kind: NudgeKind;
  createdAt: string;
  fromAvatarUrl: string | null;
}

export interface Buddy {
  linkId: string;
  userId: string;
  name: string;
  handle: string;
  initials: string;
  streak: number;
  days: DayOfWeek[];
  /** The buddy's own local calendar day of their latest check-in, "YYYY-MM-DD". */
  lastCheckInDay: string | null;
  lastCheckedInAt: string | null;
  avatarUrl: string | null;
}

export interface Invite {
  linkId: string;
  name: string;
  handle: string;
  initials: string;
}

interface BuddiesState {
  buddies: Buddy[];
  /** Incoming requests waiting on this user. */
  invites: Invite[];
  /** Requests this user has sent that haven't been accepted yet. */
  outgoingPending: number;
  loading: boolean;
  /** True when there's no Supabase session (dev bypass / signed out). */
  needsAccount: boolean;
  inbox: InboxNudge[];
  /** `${buddyUserId}:${kind}` for everything sent today — one of each per buddy per day. */
  sentToday: string[];
  /** False until the nudges table is reachable (migration 004), so the UI can hide the buttons. */
  nudgesReady: boolean;

  load: () => Promise<void>;
  /** Live updates for links, check-ins and streaks. Returns an unsubscribe. */
  subscribe: () => () => void;
  requestByCode: (code: string) => Promise<{ error: string | null; name?: string; accepted?: boolean }>;
  accept: (linkId: string) => Promise<{ error: string | null }>;
  decline: (linkId: string) => Promise<{ error: string | null }>;
  remove: (linkId: string) => Promise<{ error: string | null }>;
  sendNudge: (buddyUserId: string, kind: NudgeKind) => Promise<{ error: string | null }>;
  /** One cheer or nudge to each of several buddies, in a single request. Skips anyone already sent one today. */
  sendNudges: (buddyUserIds: string[], kind: NudgeKind) => Promise<{ error: string | null; sent: number }>;
  markInboxSeen: () => Promise<void>;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

interface FeedRow {
  link_id: string;
  buddy_id: string;
  full_name: string;
  handle: string | null;
  streak: number;
  days: string[];
  last_check_in_day: string | null;
  last_checked_in_at: string | null;
  /** Present once migration 005 has run. */
  avatar_url?: string | null;
}

interface NudgeRow {
  id: string;
  from_id: string;
  kind: NudgeKind;
  created_at: string;
  sender: { full_name: string; avatar_url: string | null } | { full_name: string; avatar_url: string | null }[] | null;
}

interface InviteRow {
  id: string;
  requester: { full_name: string; handle: string | null } | { full_name: string; handle: string | null }[] | null;
}

export const useBuddiesStore = create<BuddiesState>()((set, get) => ({
  buddies: [],
  invites: [],
  outgoingPending: 0,
  loading: true,
  needsAccount: false,
  inbox: [],
  sentToday: [],
  nudgesReady: false,

  load: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const me = sessionData.session?.user.id;
    if (!me) {
      set({ buddies: [], invites: [], outgoingPending: 0, loading: false, needsAccount: true, inbox: [], sentToday: [], nudgesReady: false });
      return;
    }

    const today = toISODate(new Date());
    const [feed, incoming, outgoing, inboxRes, sentRes] = await Promise.all([
      supabase.from('buddy_feed').select('*'),
      supabase
        .from('buddy_links')
        .select('id, requester:profiles!buddy_links_requester_id_fkey(full_name, handle)')
        .eq('recipient_id', me)
        .eq('status', 'pending'),
      supabase
        .from('buddy_links')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', me)
        .eq('status', 'pending'),
      supabase
        .from('nudges')
        .select('id, from_id, kind, created_at, sender:profiles!nudges_from_id_fkey(full_name, avatar_url)')
        .eq('to_id', me)
        .is('seen_at', null)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('nudges').select('to_id, kind').eq('from_id', me).eq('day', today),
    ]);

    if (feed.error) console.warn('buddy_feed failed', feed.error.message);
    if (incoming.error) console.warn('invites failed', incoming.error.message);

    const buddies: Buddy[] = ((feed.data ?? []) as FeedRow[]).map((r) => ({
      linkId: r.link_id,
      userId: r.buddy_id,
      name: r.full_name || 'Buddy',
      handle: r.handle ?? '',
      initials: initialsFor(r.full_name || 'Buddy'),
      streak: r.streak ?? 0,
      days: (r.days ?? []) as DayOfWeek[],
      lastCheckInDay: r.last_check_in_day,
      lastCheckedInAt: r.last_checked_in_at,
      avatarUrl: r.avatar_url ?? null,
    }));

    const invites: Invite[] = ((incoming.data ?? []) as InviteRow[]).map((r) => {
      const req = Array.isArray(r.requester) ? r.requester[0] : r.requester;
      const name = req?.full_name || 'Someone';
      return { linkId: r.id, name, handle: req?.handle ?? '', initials: initialsFor(name) };
    });

    const inbox: InboxNudge[] = ((inboxRes.data ?? []) as NudgeRow[]).map((r) => {
      const sender = Array.isArray(r.sender) ? r.sender[0] : r.sender;
      return {
        id: r.id,
        fromId: r.from_id,
        fromName: sender?.full_name || 'A buddy',
        fromAvatarUrl: sender?.avatar_url ?? null,
        kind: r.kind,
        createdAt: r.created_at,
      };
    });
    const sentToday = ((sentRes.data ?? []) as { to_id: string; kind: NudgeKind }[]).map((r) => `${r.to_id}:${r.kind}`);

    set({
      inbox,
      sentToday,
      nudgesReady: !sentRes.error,
      buddies: buddies.sort((a, b) => a.name.localeCompare(b.name)),
      invites,
      outgoingPending: outgoing.count ?? 0,
      loading: false,
      needsAccount: false,
    });
  },

  subscribe: () => {
    const reload = () => void get().load();
    const channel = supabase
      .channel('buddies-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buddy_links' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, reload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, reload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nudges' }, reload)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },

  requestByCode: async (code) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return { error: 'Sign in to pair with a buddy.' };
    const { data, error } = await supabase.rpc('request_buddy', { code });
    // request_buddy raises friendly messages itself (unknown code, your own code, rate limit).
    if (error) return { error: error.code === 'P0001' ? error.message : 'Couldn\u2019t pair right now. Check your connection and try again.' };
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.link_id) notifyBuddy({ event: row.status === 'accepted' ? 'accepted' : 'request', linkId: row.link_id });
    await get().load();
    return { error: null, name: row?.full_name || 'Buddy', accepted: row?.status === 'accepted' };
  },

  accept: async (linkId) => {
    const { error } = await supabase
      .from('buddy_links')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', linkId);
    if (error) return { error: error.message };
    notifyBuddy({ event: 'accepted', linkId });
    await get().load();
    return { error: null };
  },

  decline: async (linkId) => {
    const { error } = await supabase.from('buddy_links').delete().eq('id', linkId);
    if (error) return { error: error.message };
    await get().load();
    return { error: null };
  },

  remove: async (linkId) => {
    const { error } = await supabase.from('buddy_links').delete().eq('id', linkId);
    if (error) return { error: error.message };
    await get().load();
    return { error: null };
  },

  sendNudge: async (buddyUserId, kind) => {
    const { data } = await supabase.auth.getSession();
    const me = data.session?.user.id;
    if (!me) return { error: 'Sign in to send cheers and nudges.' };

    const key = `${buddyUserId}:${kind}`;
    set((s) => ({ sentToday: [...s.sentToday, key] }));
    const { data: inserted, error } = await supabase
      .from('nudges')
      .insert({ from_id: me, to_id: buddyUserId, kind, day: toISODate(new Date()) })
      .select('id');
    // Already sent one today counts as sent.
    if (error && error.code !== '23505') {
      set((s) => ({ sentToday: s.sentToday.filter((k) => k !== key) }));
      return { error: error.message };
    }
    notifyBuddy({ event: 'nudges', ids: (inserted ?? []).map((r) => r.id) });
    return { error: null };
  },

  sendNudges: async (buddyUserIds, kind) => {
    const { data } = await supabase.auth.getSession();
    const me = data.session?.user.id;
    if (!me) return { error: 'Sign in to send cheers and nudges.', sent: 0 };

    const already = new Set(get().sentToday);
    const targets = buddyUserIds.filter((id) => !already.has(`${id}:${kind}`));
    if (targets.length === 0) return { error: null, sent: 0 };

    const keys = targets.map((id) => `${id}:${kind}`);
    const day = toISODate(new Date());
    set((s) => ({ sentToday: [...s.sentToday, ...keys] }));
    // ON CONFLICT DO NOTHING, so one that raced in from another device doesn't fail the batch.
    const { data: inserted, error } = await supabase
      .from('nudges')
      .upsert(
        targets.map((to_id) => ({ from_id: me, to_id, kind, day })),
        { onConflict: 'from_id,to_id,kind,day', ignoreDuplicates: true }
      )
      .select('id');
    if (error) {
      set((s) => ({ sentToday: s.sentToday.filter((k) => !keys.includes(k)) }));
      return { error: error.message, sent: 0 };
    }
    // Only newly inserted rows come back, so a duplicate never notifies twice.
    notifyBuddy({ event: 'nudges', ids: (inserted ?? []).map((r) => r.id) });
    return { error: null, sent: targets.length };
  },

  markInboxSeen: async () => {
    const ids = get().inbox.map((n) => n.id);
    if (ids.length === 0) return;
    set({ inbox: [] });
    const { error } = await supabase.from('nudges').update({ seen_at: new Date().toISOString() }).in('id', ids);
    if (error) console.warn('markInboxSeen failed', error.message);
  },
}));
