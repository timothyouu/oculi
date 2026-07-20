-- Zero out fictional seed baselines in the catalog table (demo-to-product
-- audit items 4/10). lib/data.ts's saveCount/followerCount/likeCount were
-- static fictional flavor numbers that never moved with real user actions;
-- real aggregates are now overlaid at hydration time (place_save_counts(),
-- and the new user_follow_counts()/photo_like_counts() added alongside this
-- migration). Zeroing the seed baseline means "N saves/followers/likes" in
-- the UI reflects only real activity, with no phantom starting count.
--
-- Idempotent: only updates rows where the key exists and re-running is a
-- no-op once already zeroed. Does not touch public.photos (real uploads'
-- likeCount, if any is ever added there, is governed by real hydration, not
-- this seed-catalog cleanup) -- uploads already live outside this table
-- since 20260710000500_migrate_uploads_to_photos_table.sql.

update public.oculi_demo_catalog_items
set payload = jsonb_set(payload, '{followerCount}', '0'::jsonb)
where kind = 'user'
  and payload ? 'followerCount'
  and payload->'followerCount' <> '0'::jsonb;

update public.oculi_demo_catalog_items
set payload = jsonb_set(payload, '{likeCount}', '0'::jsonb)
where kind = 'photo'
  and payload ? 'likeCount'
  and payload->'likeCount' <> '0'::jsonb;

-- Place saveCount is also zeroed here for completeness/idempotency; the
-- companion regenerated 20260709000100_place_taxonomy_fields.sql migration
-- upserts full place payloads (including saveCount: 0) and is the primary
-- mechanism, but this update guarantees convergence even if that file's
-- upserts are ever skipped or partially applied.
update public.oculi_demo_catalog_items
set payload = jsonb_set(payload, '{saveCount}', '0'::jsonb)
where kind = 'place'
  and payload ? 'saveCount'
  and payload->'saveCount' <> '0'::jsonb;
