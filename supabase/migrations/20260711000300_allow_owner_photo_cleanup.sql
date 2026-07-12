-- Let the upload transaction remove its own storage object when the
-- subsequent public.photos insert fails. The UUID folder guard matches the
-- INSERT/UPDATE namespace policy from migration 20260711000200.

create policy "Owner can delete own photo objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'oculi-photos'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
