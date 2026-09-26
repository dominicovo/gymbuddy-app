-- Run this in the Supabase SQL Editor after 001–005.
--
-- In-app account deletion, which the App Store requires of any app that
-- lets people create an account (Guideline 5.1.1(v)).
--
-- Deleting the auth user cascades to the profile, and from there to buddy
-- links, check-ins, the schedule and nudges. The profile photo is removed by
-- the app through the Storage API first — Storage files can't be deleted
-- from SQL.

create or replace function public.delete_account()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
