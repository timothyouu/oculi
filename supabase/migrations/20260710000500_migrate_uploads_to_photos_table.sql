-- Migrate the existing legitimate upload rows out of the seed catalog table
-- into the new `photos` table, then lock the catalog table's upload-path
-- write policies down to fully read-only (docs/demo-to-product-audit.md
-- item 3, part 2).
--
-- At the time this was written there is exactly one real upload row in
-- oculi_demo_catalog_items (kind='photo', item_id like 'upload-%'):
-- upload-23ca4150-573b-4cf5-a02d-29ba4178a71a, payload.userId='user-guest'.
-- 'user-guest' is the fictional demo profile id, not a real Supabase auth
-- uid -- this row predates the auth rollout (created 2026-07-09; the first
-- real auth.users row is 2026-07-10), so there is no session to attribute
-- it to. Its owner_id is left NULL rather than invented; moderation_status
-- is set to 'approved' since it was already live, publicly-visible content.

insert into public.photos (
  id, owner_id, place_id, caption, image_url, tags,
  shot_at_time_of_day, location_label, like_count, created_at, moderation_status
)
select
  payload->>'id',
  null,
  payload->>'placeId',
  payload->>'caption',
  payload->>'imageUrl',
  coalesce(
    (select array_agg(value #>> '{}') from jsonb_array_elements(payload->'tags')),
    '{}'
  ),
  payload->>'shotAtTimeOfDay',
  payload->>'locationLabel',
  coalesce((payload->>'likeCount')::int, 0),
  coalesce((payload->>'createdAt')::timestamptz, now()),
  'approved'
from public.oculi_demo_catalog_items
where kind = 'photo' and item_id like 'upload-%'
on conflict (id) do nothing;

delete from public.oculi_demo_catalog_items
where kind = 'photo' and item_id like 'upload-%';

-- The seed catalog is now fully read-only to clients: uploads live in
-- public.photos, so the upload-path INSERT/UPDATE policies added in
-- 20260710000100_rls_lockdown_add_owner_policies.sql are no longer needed.
drop policy if exists "Authenticated can insert photo uploads" on public.oculi_demo_catalog_items;
drop policy if exists "Authenticated can update photo uploads" on public.oculi_demo_catalog_items;
