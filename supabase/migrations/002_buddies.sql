-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Requires 001_profiles.sql to have been run first.

-- Streak lives on the profile so buddies can read it without scanning
-- every check-in. Client-attested, same as the check-ins themselves.
alter table public.profiles add column if not exists streak int not null default 0;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.buddy_links (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> recipient_id)
);

-- One link per pair, whichever direction it was requested in.
create unique index buddy_links_pair_idx
  on public.buddy_links (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,                       -- the user's local calendar day
  checked_in_at timestamptz not null default now(),
  unique (user_id, day)
);

create table public.schedules (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  days text[] not null default '{}',       -- e.g. {Mon,Wed,Fri}
  window_start text not null,              -- "HH:MM"
  window_end text not null,
  updated_at timestamptz not null default now()
);

alter table public.buddy_links enable row level security;
alter table public.check_ins enable row level security;
alter table public.schedules enable row level security;

-- ---------------------------------------------------------------------------
-- "Are we linked?" helper. SECURITY DEFINER so policies can call it without
-- recursing back into buddy_links' own row-level security.
-- ---------------------------------------------------------------------------

create or replace function public.is_linked(other uuid, only_accepted boolean default true)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.buddy_links l
    where ((l.requester_id = auth.uid() and l.recipient_id = other)
        or (l.recipient_id = auth.uid() and l.requester_id = other))
      and (not only_accepted or l.status = 'accepted')
  );
$$;

revoke execute on function public.is_linked(uuid, boolean) from public, anon;
grant execute on function public.is_linked(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Profiles are no longer browsable by every signed-in user. You can see your
-- own, and anyone you have a link with (pending or accepted). Strangers
-- resolve a pair code only through request_buddy() below.
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles visible to self and linked buddies"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_linked(id, false));

create policy "Links visible to either party"
  on public.buddy_links for select
  to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

-- Only the recipient can accept, and only to 'accepted'. Creating links goes
-- through request_buddy(), so there is deliberately no insert policy.
create policy "Recipient can accept"
  on public.buddy_links for update
  to authenticated
  using (recipient_id = auth.uid() and status = 'pending')
  with check (status = 'accepted');

create policy "Either party can remove a link"
  on public.buddy_links for delete
  to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "Check-ins visible to self and accepted buddies"
  on public.check_ins for select
  to authenticated
  using (user_id = auth.uid() or public.is_linked(user_id));

create policy "Users write their own check-ins"
  on public.check_ins for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users delete their own check-ins"
  on public.check_ins for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Schedules visible to self and accepted buddies"
  on public.schedules for select
  to authenticated
  using (user_id = auth.uid() or public.is_linked(user_id));

create policy "Users insert their own schedule"
  on public.schedules for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users update their own schedule"
  on public.schedules for update
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- request_buddy(code): resolve a pair code and create a pending link, in one
-- privileged step so the client never needs read access to strangers.
-- If the other person already requested *you*, this accepts instead.
-- ---------------------------------------------------------------------------

create or replace function public.request_buddy(code text)
returns table (link_id uuid, buddy_id uuid, full_name text, handle text, status text)
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  target public.profiles%rowtype;
  link public.buddy_links%rowtype;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select * into target from public.profiles p where p.pair_code = code;
  if not found then
    raise exception 'No one has that code. Double-check the four digits.';
  end if;
  if target.id = me then
    raise exception 'That is your own code.';
  end if;

  -- Brute-force guard: a 4-digit space is small, so cap outgoing requests.
  if (select count(*) from public.buddy_links
      where requester_id = me and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many pairing attempts. Try again in a while.';
  end if;

  select * into link from public.buddy_links l
    where least(l.requester_id, l.recipient_id) = least(me, target.id)
      and greatest(l.requester_id, l.recipient_id) = greatest(me, target.id);

  if found then
    if link.status = 'pending' and link.recipient_id = me then
      update public.buddy_links
        set status = 'accepted', accepted_at = now()
        where id = link.id
        returning * into link;
    end if;
  else
    insert into public.buddy_links (requester_id, recipient_id)
      values (me, target.id)
      returning * into link;
  end if;

  return query select link.id, target.id, target.full_name, target.handle, link.status;
end;
$$;

revoke execute on function public.request_buddy(text) from public, anon;
grant execute on function public.request_buddy(text) to authenticated;

-- ---------------------------------------------------------------------------
-- buddy_feed: everything the Buddies tab needs per accepted buddy, in one
-- read. security_invoker means the caller's own RLS applies underneath.
-- The latest check-in is returned with its day; the client decides whether
-- that day is "today" in the viewer's timezone.
-- ---------------------------------------------------------------------------

create or replace view public.buddy_feed
with (security_invoker = true) as
select
  l.id as link_id,
  p.id as buddy_id,
  p.full_name,
  p.handle,
  p.streak,
  coalesce(s.days, '{}') as days,
  c.day as last_check_in_day,
  c.checked_in_at as last_checked_in_at
from public.buddy_links l
join public.profiles p
  on p.id = case when l.requester_id = auth.uid() then l.recipient_id else l.requester_id end
left join public.schedules s on s.user_id = p.id
left join lateral (
  select ci.day, ci.checked_in_at
  from public.check_ins ci
  where ci.user_id = p.id
  order by ci.day desc
  limit 1
) c on true
where l.status = 'accepted'
  and (l.requester_id = auth.uid() or l.recipient_id = auth.uid());

grant select on public.buddy_feed to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime, so "In at 7:12 AM" appears without a refresh.
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.buddy_links;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.check_ins;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;
