-- Run this in the Supabase SQL Editor. Independent of 001–006.
--
-- Early-access signups from the landing page (gymbuddy-web). The site's
-- /api/waitlist route inserts with the anon key; nobody outside the dashboard
-- can read the list back.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and length(email) <= 254),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Insert only. No select policy, so signups stay private.
create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);
