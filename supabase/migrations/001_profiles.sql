-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  handle text unique,
  pair_code text unique not null,
  avatar_url text,
  member_since timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in user can look up any profile's public fields — required so a
-- pair code can be resolved to a person before the two of you are buddies.
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Generates a unique 4-digit pair code, retrying on the rare collision.
create or replace function public.generate_pair_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists_already boolean;
begin
  loop
    code := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    select exists(select 1 from public.profiles where pair_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

-- Auto-creates a profile row the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, pair_code)
  values (new.id, public.generate_pair_code());
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
