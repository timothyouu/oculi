-- Remove the demo "starter flavor" from durable state (2026-07-11, Tim's
-- direction): fresh accounts/guests now start with zero saved places and zero
-- posts (see lib/storage.ts initialDemoState + normalizeDemoState scrub), and
-- this migration aligns the database with that:
--
-- 1) Historical default-save inflation: every pre-2026-07-11 anonymous
--    visitor's bootstrap migrated the four seed-default saved places into
--    `saved_places` with no user action (~11 rows per place at cleanup time),
--    moving the public save counts. Task 6a stopped NEW inflation; this
--    deletes the historical rows. Deliberately unconditional for these four
--    place ids: there is no way to distinguish a real save of these places
--    from the fabricated default, and Tim chose removal.
delete from public.saved_places
where place_id in ('coit-tower', 'grace-cathedral', 'mission-murals', 'golden-gate-overlook');

-- 2) Scrub the same flavor out of legacy `oculi_demo_states.state` blobs so
--    the legacy-relations reconciler (lib/remote-state.ts
--    loadLegacyRelationsFromStateRow) can never resurrect it for returning
--    visitors. Surgical by id — real legacy saves/uploads in old blobs are
--    preserved (an old blob can be the ONLY durable record of a pre-
--    normalization save, so dropping whole keys would lose real data).
update public.oculi_demo_states
set state = jsonb_set(
  state,
  '{savedPlaceIds}',
  coalesce(
    (
      select jsonb_agg(t.value)
      from jsonb_array_elements_text(state -> 'savedPlaceIds') as t(value)
      where t.value not in ('coit-tower', 'grace-cathedral', 'mission-murals', 'golden-gate-overlook')
    ),
    '[]'::jsonb
  )
)
where jsonb_typeof(state -> 'savedPlaceIds') = 'array';

update public.oculi_demo_states
set state = jsonb_set(
  state,
  '{uploadedPhotos}',
  coalesce(
    (
      select jsonb_agg(photo)
      from jsonb_array_elements(state -> 'uploadedPhotos') as photo
      where photo ->> 'id' not like 'starter-upload-%'
    ),
    '[]'::jsonb
  )
)
where jsonb_typeof(state -> 'uploadedPhotos') = 'array';

-- 3) Delete the two empty anonymous auth users left behind by the 2026-07-11
--    verification sessions (all of their public-table rows were already
--    removed via owner-scoped deletes; the relation tables key on user_id
--    text with no FK, so nothing cascades).
delete from auth.users
where id in ('02a35e5f-d2d7-433f-927b-d1621a12e359', '06ea5ab3-1d9d-42a5-9b01-27ad5c774780')
  and is_anonymous;

-- Post-apply verification (must all hold):
--   select count(*) from public.saved_places
--     where place_id in ('coit-tower','grace-cathedral','mission-murals','golden-gate-overlook');
--     -- expect 0
--   select count(*) from public.oculi_demo_states,
--     jsonb_array_elements_text(state->'savedPlaceIds') t(value)
--     where t.value in ('coit-tower','grace-cathedral','mission-murals','golden-gate-overlook');
--     -- expect 0
--   select count(*) from public.oculi_demo_states,
--     jsonb_array_elements(state->'uploadedPhotos') p
--     where p->>'id' like 'starter-upload-%';
--     -- expect 0
