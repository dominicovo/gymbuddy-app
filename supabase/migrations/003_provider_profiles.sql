-- Run this in the Supabase SQL Editor after 001 and 002.
--
-- Sign-in is now Apple / Google only. Both hand us the user's name at signup,
-- so the profile is completed here, in the trigger — the app no longer needs
-- a "set up your card" step for the common case.

-- "Alex Rivera" -> "alexrivera", made unique with a numeric suffix if taken.
create or replace function public.generate_handle(display_name text)
returns text
language plpgsql
as $$
declare
  base text := left(regexp_replace(lower(coalesce(display_name, '')), '[^a-z0-9]', '', 'g'), 20);
  candidate text;
  suffix text;
  attempts int := 0;
begin
  if length(base) < 3 then
    base := 'lifter';
  end if;
  candidate := base;
  loop
    exit when not exists (select 1 from public.profiles where handle = candidate);
    attempts := attempts + 1;
    suffix := (floor(random() * 900) + 100)::int::text;
    candidate := left(base, 20 - length(suffix)) || suffix;
    if attempts > 25 then
      candidate := 'lifter' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    end if;
  end loop;
  return candidate;
end;
$$;

-- Google supplies full_name (and name); Apple's identity token carries no
-- name, so the app fills it in right after the first sign-in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  display_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );
begin
  insert into public.profiles (id, pair_code, full_name, handle)
  values (new.id, public.generate_pair_code(), display_name, public.generate_handle(display_name));
  return new;
end;
$$;
