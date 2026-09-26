-- Run this in the Supabase SQL Editor after 001–004.
--
-- Profile photos. Images live in a public "avatars" storage bucket, one
-- folder per user ("<user id>/avatar-<timestamp>.jpg"); the profile row keeps
-- the public URL. Anyone with the URL can view a photo, but only its owner
-- can add, replace or delete files in their folder.

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload to their own avatar folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users replace their own avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Buddies see the photo too. Same view as 002, with avatar_url appended.
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
  c.checked_in_at as last_checked_in_at,
  p.avatar_url
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
