-- Pending and rejected user uploads must not appear in the public catalog.
-- Owners can still see their own uploads while they await manual review;
-- approved uploads remain readable to everyone. Service-role moderation
-- bypasses RLS and can update moderation_status from the Supabase dashboard.

drop policy if exists "Anyone can read photos" on public.photos;

create policy "Approved photos or owner can read"
  on public.photos
  for select
  to public
  using (
    moderation_status = 'approved'
    or owner_id = (select auth.uid())
  );

-- Keep storage objects organized under the authenticated owner's UUID and
-- prevent clients from placing or moving their object into another user's
-- namespace. Object ownership remains enforced independently.
drop policy if exists "Authenticated can upload demo photos" on storage.objects;
drop policy if exists "Owner can update own demo photo objects" on storage.objects;

create policy "Authenticated can upload own photo objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'oculi-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owner can update own photo objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'oculi-photos'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'oculi-photos'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
