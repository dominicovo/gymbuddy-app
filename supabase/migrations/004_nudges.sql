-- Run this in the Supabase SQL Editor after 001, 002 and 003.
--
-- Cheers and nudges between buddies. A "cheer" congratulates a buddy who has
-- checked in; a "nudge" pokes one who hasn't yet. One of each, per pair, per
-- day — enough to feel it, not enough to spam.

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('cheer', 'nudge')),
  day date not null,                       -- the sender's local calendar day
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  check (from_id <> to_id),
  unique (from_id, to_id, kind, day)
);

create index nudges_inbox_idx on public.nudges (to_id, seen_at);

alter table public.nudges enable row level security;

create policy "Nudges visible to sender and recipient"
  on public.nudges for select
  to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

-- Only to an accepted buddy, and only as yourself.
create policy "Send nudges to buddies"
  on public.nudges for insert
  to authenticated
  with check (from_id = auth.uid() and public.is_linked(to_id));

-- The recipient can mark a nudge seen — and, through the column grant
-- below, change nothing else about it.
create policy "Recipient marks nudges seen"
  on public.nudges for update
  to authenticated
  using (to_id = auth.uid())
  with check (to_id = auth.uid());

revoke update on public.nudges from authenticated;
grant update (seen_at) on public.nudges to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.nudges;
exception when duplicate_object then null; end $$;
