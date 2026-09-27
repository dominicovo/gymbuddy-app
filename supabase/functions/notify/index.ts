// Sends GymBuddy push notifications through Apple (APNs).
//
// The app calls this right after it sends a nudge or cheer, requests a buddy,
// or accepts one. Nothing in the request is trusted: we look the event up with
// the service role and only notify if the caller really just did it. push_log
// makes every notification send at most once.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   APNS_KEY_ID       the 10-character Key ID of the APNs auth key
//   APNS_PRIVATE_KEY  contents of the AuthKey_XXXXXXXXXX.p8 file
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const TEAM_ID = 'GA5P2J5N3R';
const BUNDLE_ID = 'com.dominiceburuoh.gymbuddy';
const RECENT_MS = 15 * 60 * 1000; // only events from the last 15 minutes

type Event = { event: 'nudges'; ids: string[] } | { event: 'request' | 'accepted'; linkId: string };

type Push = { userId: string; key: string; title: string; body: string; type: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await caller.auth.getUser();
  const me = auth.user?.id;
  if (!me) return json({ error: 'Not signed in' }, 401);

  let input: Event;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: sender } = await admin.from('profiles').select('full_name').eq('id', me).single();
  const name = firstName(sender?.full_name) ?? 'Your buddy';
  const fullName = sender?.full_name?.trim() || 'Someone';
  const since = new Date(Date.now() - RECENT_MS).toISOString();

  const pushes: Push[] = [];

  if (input.event === 'nudges' && Array.isArray(input.ids) && input.ids.length > 0) {
    const { data } = await admin
      .from('nudges')
      .select('id, to_id, kind')
      .in('id', input.ids.slice(0, 100))
      .eq('from_id', me)
      .gte('created_at', since);
    for (const n of data ?? []) {
      pushes.push(
        n.kind === 'cheer'
          ? { userId: n.to_id, key: `nudge:${n.id}`, type: 'cheer', title: `${name} cheered you on`, body: 'Nice work showing up today. Keep the streak going.' }
          : { userId: n.to_id, key: `nudge:${n.id}`, type: 'nudge', title: `${name} nudged you`, body: 'Still time to get to the gym today. Your buddy is watching.' }
      );
    }
  } else if (input.event === 'request' && typeof input.linkId === 'string') {
    const { data: link } = await admin
      .from('buddy_links')
      .select('id, recipient_id')
      .eq('id', input.linkId)
      .eq('requester_id', me)
      .eq('status', 'pending')
      .maybeSingle();
    if (link) {
      pushes.push({ userId: link.recipient_id, key: `request:${link.id}`, type: 'request', title: `${fullName} wants to be your gym buddy`, body: 'Open GymBuddy to accept.' });
    }
  } else if (input.event === 'accepted' && typeof input.linkId === 'string') {
    const { data: link } = await admin
      .from('buddy_links')
      .select('id, requester_id, recipient_id, accepted_at')
      .eq('id', input.linkId)
      .eq('status', 'accepted')
      .gte('accepted_at', since)
      .maybeSingle();
    if (link && (link.requester_id === me || link.recipient_id === me)) {
      const other = link.requester_id === me ? link.recipient_id : link.requester_id;
      pushes.push({ userId: other, key: `accepted:${link.id}`, type: 'accepted', title: `${fullName} is now your gym buddy`, body: 'You’ll see each other’s check-ins and streaks.' });
    }
  } else {
    return json({ error: 'Unknown event' }, 400);
  }

  let sent = 0;
  try {
    for (const push of pushes) sent += await deliver(admin, push);
  } catch (error) {
    // Most likely the APNs secrets are missing or malformed.
    console.error('notify failed', error);
    return json({ error: 'Could not send' }, 500);
  }
  return json({ sent });
});

/** Claims the push_log key, then sends to every device the user has. Returns devices reached. */
async function deliver(admin: SupabaseClient, push: Push): Promise<number> {
  const { error: claimed } = await admin.from('push_log').insert({ key: push.key });
  if (claimed) return 0; // already sent (duplicate key) or log unavailable

  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', push.userId);
  let reached = 0;
  for (const { token } of tokens ?? []) {
    const result = await sendApns(token, {
      aps: { alert: { title: push.title, body: push.body }, sound: 'default', 'thread-id': 'buddies' },
      gb: { type: push.type },
    });
    if (result === 'ok') reached++;
    else if (result === 'gone') await admin.from('push_tokens').delete().eq('token', token);
  }
  return reached;
}

/**
 * TestFlight/App Store builds get production tokens; builds run from Xcode get
 * sandbox ones. Try production first and fall back if Apple says it's the other.
 */
async function sendApns(token: string, payload: unknown): Promise<'ok' | 'gone' | 'failed'> {
  for (const host of ['api.push.apple.com', 'api.sandbox.push.apple.com']) {
    const res = await fetch(`https://${host}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${await providerToken()}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return 'ok';
    const reason = (await res.json().catch(() => ({})))?.reason as string | undefined;
    if (res.status === 410 || reason === 'Unregistered') return 'gone';
    if (reason === 'BadDeviceToken') continue; // wrong environment — try the other one
    console.error('APNs rejected push', host, res.status, reason);
    return 'failed';
  }
  return 'gone'; // not valid in either environment
}

// APNs provider token: an ES256 JWT, valid for up to an hour. Reused for 50 minutes.
let cached: { jwt: string; at: number } | null = null;

async function providerToken(): Promise<string> {
  if (cached && Date.now() - cached.at < 50 * 60 * 1000) return cached.jwt;
  const keyId = Deno.env.get('APNS_KEY_ID');
  const pem = Deno.env.get('APNS_PRIVATE_KEY');
  if (!keyId || !pem) throw new Error('APNS_KEY_ID / APNS_PRIVATE_KEY secrets are not set');

  // Accept the .p8 as pasted: with or without header lines, real or escaped newlines.
  const base64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'ES256', kid: keyId }))}.${b64url(JSON.stringify({ iss: TEAM_ID, iat }))}`;
  // WebCrypto's ECDSA signature is already the raw r||s form JWS expects.
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(new Uint8Array(signature))}`;
  cached = { jwt, at: Date.now() };
  return jwt;
}

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function firstName(full: string | null | undefined): string | null {
  const first = full?.trim().split(/\s+/)[0];
  return first || null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
