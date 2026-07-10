-- RLS lockdown follow-up: storage.objects write policies for oculi-photos
-- (docs/demo-to-product-audit.md item 2, storage half).
--
-- The previous migrations left three role-`public` write policies on
-- storage.objects qualified only by bucket_id, so any client holding the
-- anon key could overwrite or delete every uploaded photo. The app's only
-- storage operations (lib/remote-state.ts uploadPhotoFile) are:
--   - upload(path, file, { upsert: true })  -> INSERT, and on retry of the
--     same path, UPDATE (storage upsert requires INSERT + SELECT + UPDATE)
--   - getPublicUrl(path) -> unauthenticated public-bucket URL route, which
--     does not consult these policies at all
-- It never deletes or lists objects.
--
-- New model: INSERT for any authenticated session (anonymous visitors use
-- the `authenticated` role); SELECT/UPDATE only for the object's owner
-- (storage sets owner_id to the uploader's auth.uid()), which is exactly
-- what upsert-retry needs; DELETE dropped with no replacement.

drop policy if exists "Allow demo photo uploads" on storage.objects;
drop policy if exists "Allow demo photo updates" on storage.objects;
drop policy if exists "Allow demo photo deletes" on storage.objects;

create policy "Authenticated can upload demo photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'oculi-photos');

create policy "Owner can read own demo photo objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'oculi-photos'
    and owner_id = (select auth.uid())::text
  );

create policy "Owner can update own demo photo objects"
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
  );
