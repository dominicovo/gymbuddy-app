-- GymBuddy: dummy buddies for testing. Paste into Supabase → SQL Editor → Run.
--
-- Creates pretend accounts (emails @seed.gymbuddy.invalid — a reserved
-- domain, so they can't reach anyone and can't sign in) and pairs them with
-- YOUR account in every state the Buddies tab shows:
--   Checked in today ... Maya Chen (12-day streak), Priya Patel (23)
--   Still to go ........ Jordan Okafor (4), Chris Walker (0)
--   Rest day ........... Sam Rivera (7)
--   Request to you ..... Leo Martins        (Accept / Decline)
--   Request from you ... Ava Thompson       ("1 request sent")
--   Your inbox ......... a cheer from Maya, a nudge from Jordan
--
-- Safe to re-run: it removes the previous seed accounts first.
-- Undo everything with remove_dummy_buddies.sql.

-- Your account = whoever signed in to GymBuddy most recently (the seed
-- accounts never sign in, so they can't be picked).
create or replace function pg_temp.seed_target() returns uuid language sql as $$
  select id from auth.users
  where email is null or email not like '%@seed.gymbuddy.invalid'
  order by last_sign_in_at desc nulls last
  limit 1;
$$;

create or replace function pg_temp.seed_user(p_name text, p_slug text, p_avatar text, p_streak int, p_days text[])
returns uuid language plpgsql as $$
declare
  uid uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    p_slug || '@seed.gymbuddy.invalid', '', now(),
    '{"provider":"seed","providers":["seed"]}', jsonb_build_object('full_name', p_name),
    now() - interval '90 days', now(), '', '', '', ''
  );
  -- The on_auth_user_created trigger has made the profile; fill in the rest.
  update public.profiles
    set avatar_url = p_avatar, streak = p_streak, member_since = now() - interval '90 days'
    where id = uid;
  insert into public.schedules (user_id, days, window_start, window_end)
    values (uid, p_days, '06:00', '20:00');
  return uid;
end;
$$;

do $$
declare
  tz constant text := 'Europe/London';
  me uuid := pg_temp.seed_target();
  today date := (now() at time zone tz)::date;
  dow text := to_char((now() at time zone tz)::date, 'Dy');   -- e.g. 'Thu'
  week text[] := array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  with_today text[];
  without_today text[];
  maya uuid; priya uuid; jordan uuid; chris uuid; sam uuid; leo uuid; ava uuid;
begin
  if me is null then
    raise exception 'No real account found. Sign in to GymBuddy once, then run this again.';
  end if;
  raise notice 'Seeding buddies for % (%)', (select email from auth.users where id = me), me;

  -- Start clean: deleting the auth users cascades to profiles, links, check-ins, nudges.
  delete from auth.users where email like '%@seed.gymbuddy.invalid';

  -- Gym-day sets that do / don't include today, whatever day it is.
  with_today := array(select d from unnest(week) d where d = dow or d in ('Mon','Wed','Fri'));
  without_today := array(select d from unnest(week) d where d <> dow limit 3);

  maya   := pg_temp.seed_user('Maya Chen',     'maya',   'https://randomuser.me/api/portraits/women/44.jpg', 12, with_today);
  priya  := pg_temp.seed_user('Priya Patel',   'priya',  'https://randomuser.me/api/portraits/women/68.jpg', 23, week);
  jordan := pg_temp.seed_user('Jordan Okafor', 'jordan', 'https://randomuser.me/api/portraits/men/32.jpg',    4, with_today);
  chris  := pg_temp.seed_user('Chris Walker',  'chris',  null,                                                0, with_today);
  sam    := pg_temp.seed_user('Sam Rivera',    'sam',    null,                                                7, without_today);
  leo    := pg_temp.seed_user('Leo Martins',   'leo',    'https://randomuser.me/api/portraits/men/75.jpg',    9, with_today);
  ava    := pg_temp.seed_user('Ava Thompson',  'ava',    null,                                                2, with_today);

  -- Accepted buddies.
  insert into public.buddy_links (requester_id, recipient_id, status, accepted_at) values
    (maya,   me, 'accepted', now() - interval '30 days'),
    (me,  priya, 'accepted', now() - interval '21 days'),
    (jordan, me, 'accepted', now() - interval '14 days'),
    (me,  chris, 'accepted', now() - interval '9 days'),
    (sam,    me, 'accepted', now() - interval '5 days');

  -- Pending both ways.
  insert into public.buddy_links (requester_id, recipient_id, status) values
    (leo, me, 'pending'),
    (me, ava, 'pending');

  -- Check-ins. Maya and Priya are in today; the others last went earlier.
  insert into public.check_ins (user_id, day, checked_in_at) values
    (maya,   today,     (today + time '06:42') at time zone tz),
    (maya,   today - 2, (today - 2 + time '07:05') at time zone tz),
    (priya,  today,     (today + time '07:55') at time zone tz),
    (priya,  today - 1, (today - 1 + time '06:30') at time zone tz),
    (jordan, today - 2, (today - 2 + time '18:20') at time zone tz),
    (chris,  today - 9, (today - 9 + time '12:10') at time zone tz),
    (sam,    today - 1, (today - 1 + time '17:45') at time zone tz);

  -- Waiting in your inbox.
  insert into public.nudges (from_id, to_id, kind, day) values
    (maya,   me, 'cheer', today),
    (jordan, me, 'nudge', today);

  raise notice 'Done: 5 buddies, 1 request to you, 1 request from you, 2 inbox items.';
end;
$$;
