-- GymBuddy: a crowd of 45 more dummy buddies, to test the Buddies tab at
-- scale (~50 with dummy_buddies.sql). Paste into SQL Editor → Run.
--
-- Roughly 40% still to go, 35% checked in today, 25% on a rest day, with
-- varied streaks and a mix of photos / initials, plus 3 extra incoming
-- requests so "Show all" appears. Safe to re-run (replaces the crowd only).
-- remove_dummy_buddies.sql removes these too.

create or replace function pg_temp.seed_target() returns uuid language sql as $$
  select id from auth.users
  where email is null or email not like '%@seed.gymbuddy.invalid'
  order by last_sign_in_at desc nulls last
  limit 1;
$$;

do $$
declare
  tz constant text := 'Europe/London';
  me uuid := pg_temp.seed_target();
  today date := (now() at time zone tz)::date;
  dow text := to_char((now() at time zone tz)::date, 'Dy');
  week text[] := array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  with_today text[];
  without_today text[];
  firsts text[] := array['Aisha','Ben','Carmen','Dev','Elena','Femi','Grace','Hugo','Isla','Jamal','Kira','Liam','Mei','Noah','Olu','Pia','Quinn','Rosa','Tariq','Uma','Victor','Wren','Yusuf','Zara','Arjun','Bea','Cole','Dana','Eli','Fatima','Gabe','Hana','Ivan','Jade','Kofi','Lena','Marco','Nia','Omar','Poppy','Raj','Sofia','Theo','Una','Wes'];
  lasts text[] := array['Adeyemi','Brooks','Castillo','Dubois','Evans','Fischer','Garcia','Hughes','Ibrahim','Jensen','Khan','Lopez','Moreau','Nakamura','Owusu','Park','Quinn','Russo','Silva','Tanaka','Usman','Vega','Walsh','Xu','Young','Zhou','Ali','Bell','Costa','Diaz','Ellis','Ford','Grant','Hale','Ito','Jones','Kaur','Lee','Mensah','Novak','Ortiz','Price','Reid','Shah','Tran'];
  i int;
  uid uuid;
  status text;
  photo text;
  full_name text;
begin
  if me is null then
    raise exception 'No real account found. Sign in to GymBuddy once, then run this again.';
  end if;

  delete from auth.users where email like 'crowd-%@seed.gymbuddy.invalid';

  with_today := array(select d from unnest(week) d where d = dow or d in ('Mon','Wed','Fri'));
  without_today := array(select d from unnest(week) d where d <> dow limit 3);

  for i in 1..45 loop
    uid := gen_random_uuid();
    full_name := firsts[i] || ' ' || lasts[i];
    status := case when i % 20 < 8 then 'due' when i % 20 < 15 then 'in' else 'rest' end;
    -- Every other buddy gets a photo; the rest show coloured initials.
    photo := case when i % 2 = 0
      then 'https://randomuser.me/api/portraits/' || (case when i % 4 = 0 then 'women' else 'men' end) || '/' || (i + 10) || '.jpg'
      else null end;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'crowd-' || lpad(i::text, 2, '0') || '@seed.gymbuddy.invalid', '', now(),
      '{"provider":"seed","providers":["seed"]}', jsonb_build_object('full_name', full_name),
      now() - interval '60 days', now(), '', '', '', ''
    );

    update public.profiles
      set avatar_url = photo, streak = (i * 7) % 41, member_since = now() - interval '60 days'
      where id = uid;

    insert into public.schedules (user_id, days, window_start, window_end)
      values (uid, case when status = 'rest' then without_today else with_today end, '06:00', '20:00');

    -- The first three are waiting on you instead of already paired.
    if i <= 3 then
      insert into public.buddy_links (requester_id, recipient_id, status) values (uid, me, 'pending');
      continue;
    end if;

    insert into public.buddy_links (requester_id, recipient_id, status, accepted_at)
      values (uid, me, 'accepted', now() - (i || ' days')::interval);

    if status = 'in' then
      -- Spread arrival times through the morning, never later than right now.
      insert into public.check_ins (user_id, day, checked_in_at) values (
        uid, today,
        least(now(), ((today + time '05:30') + ((i * 17) % 420) * interval '1 minute') at time zone tz)
      );
    else
      insert into public.check_ins (user_id, day, checked_in_at)
        values (uid, today - (1 + i % 4), ((today - (1 + i % 4)) + time '07:15') at time zone tz);
    end if;
  end loop;

  raise notice 'Done: 42 more buddies and 3 more requests for %.', (select email from auth.users where id = me);
end;
$$;
