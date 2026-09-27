-- Run this in the Supabase SQL Editor after 001–006.
--
-- Push notifications for nudges, cheers and buddy requests. The app registers
-- its APNs device token here; the `notify` Edge Function (supabase/functions/
-- notify) reads tokens with the service role and sends through Apple.

create table if not exists public.push_tokens (
  token text primary key,                  -- APNs device token (hex)
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'ios' check (platform in ('ios')),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- No policies: the app goes through the functions below, and only the Edge
-- Function (service role) reads other people's tokens.
alter table public.push_tokens enable row level security;

-- One row per notification ever sent ("nudge:<id>", "request:<link id>", …),
-- so a retry or a double tap can't push twice. Service role only.
create table if not exists public.push_log (
  key text primary key,
  created_at timestamptz not null default now()
);

alter table public.push_log enable row level security;

-- ---------------------------------------------------------------------------
-- register_push_token(token): claim this device for the caller. A phone that
-- signs into a different account moves over instead of notifying both.
-- ---------------------------------------------------------------------------

create or replace function public.register_push_token(device_token text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;
  if device_token !~ '^[0-9a-fA-F]{32,200}$' then
    raise exception 'Not a device token.';
  end if;

  insert into public.push_tokens (token, user_id, updated_at)
    values (lower(device_token), me, now())
    on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end;
$$;

revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;

-- Signing out: stop sending this account's notifications to this phone.
create or replace function public.unregister_push_token(device_token text)
returns void
language sql security definer set search_path = public
as $$
  delete from public.push_tokens
  where token = lower(device_token) and user_id = auth.uid();
$$;

revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;
