-- Normalize per-user relation state into dedicated tables
-- (docs/demo-to-product-audit.md items 6+7).
--
-- Previously the entire `DemoState` blob -- including `savedPlaceIds`,
-- `followedUserIds`, `likedPhotoIds`, and `viewedPhotoIds` -- was upserted as
-- one JSON document per visitor into `oculi_demo_states` on every change.
-- That's last-write-wins across tabs/devices (two tabs saving/unsaving
-- different places race and the loser's whole state, not just the one
-- field, gets clobbered) and `viewedPhotoIds` grows unboundedly forever.
--
-- These four tables give each relation its own row per (user, entity) pair,
-- so a toggle is a single atomic insert/delete instead of a whole-state
-- upsert, and repeat views of the same photo update one row's `viewed_at`
-- instead of appending to an ever-growing array. `oculi_demo_states` keeps
-- the remaining scalar/session fields (lastViewedPlaceId,
-- lastDiscoveryPlaceId, discoveryActiveIndex, placeViews, viewedPlaceIds,
-- uploadedPhotos, profile) -- see lib/remote-state.ts `durableStateForRemote`,
-- which now also strips the four migrated fields before upload so old blob
-- copies of them stop being treated as the source of truth. lib/demo-state.tsx
-- reconciles any pre-existing blob/localStorage relation data into these
-- tables once on bootstrap so nothing already saved is lost.
--
-- `user_id` is `text` to match the existing `auth.uid()::text` comparison
-- pattern already used on `oculi_demo_states`/`route_plans` (see
-- 20260710000100_rls_lockdown_add_owner_policies.sql) rather than uuid.

create table public.saved_places (
  user_id text not null,
  place_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.liked_photos (
  user_id text not null,
  photo_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, photo_id)
);

create table public.followed_users (
  user_id text not null,
  followed_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, followed_user_id)
);

create table public.viewed_photos (
  user_id text not null,
  photo_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (user_id, photo_id)
);

comment on table public.saved_places is 'Owner-scoped place saves, one row per (user, place). Replaces DemoState.savedPlaceIds. See docs/demo-to-product-audit.md item 6.';
comment on table public.liked_photos is 'Owner-scoped photo likes, one row per (user, photo). Replaces DemoState.likedPhotoIds. See docs/demo-to-product-audit.md item 6.';
comment on table public.followed_users is 'Owner-scoped follows, one row per (user, followed user). Replaces DemoState.followedUserIds. See docs/demo-to-product-audit.md item 6.';
comment on table public.viewed_photos is 'Owner-scoped photo view receipts, one row per (user, photo), viewed_at updated on repeat views instead of growing an array. Replaces DemoState.viewedPhotoIds. See docs/demo-to-product-audit.md item 6.';

-- Aggregate index for the real saveCount overlay (item 7): counting rows per
-- place_id across all users is the hot path for `place_save_counts` below.
create index saved_places_place_id_idx on public.saved_places (place_id);

alter table public.saved_places enable row level security;
alter table public.liked_photos enable row level security;
alter table public.followed_users enable row level security;
alter table public.viewed_photos enable row level security;

-- --- saved_places: owner-only, matching the RLS lockdown pattern ---
create policy "Owner can read saved places"
  on public.saved_places for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "Owner can insert saved places"
  on public.saved_places for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "Owner can delete saved places"
  on public.saved_places for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- --- liked_photos: owner-only ---
create policy "Owner can read liked photos"
  on public.liked_photos for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "Owner can insert liked photos"
  on public.liked_photos for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "Owner can delete liked photos"
  on public.liked_photos for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- --- followed_users: owner-only ---
create policy "Owner can read followed users"
  on public.followed_users for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "Owner can insert followed users"
  on public.followed_users for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "Owner can delete followed users"
  on public.followed_users for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- --- viewed_photos: owner-only, plus update so repeat views can bump
--     viewed_at via upsert instead of inserting a new row ---
create policy "Owner can read viewed photos"
  on public.viewed_photos for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "Owner can insert viewed photos"
  on public.viewed_photos for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "Owner can update viewed photos"
  on public.viewed_photos for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);

-- --- place_save_counts: public aggregate view backing the real saveCount
--     overlay (item 7). Created/owned by the migration role (effectively
--     postgres), so it is not subject to the per-row RLS restricting
--     saved_places to its owner -- the view intentionally exposes only a
--     place_id + count aggregate, never who saved what, so this is safe to
--     read publicly the same way the seed catalog already is. ---
create view public.place_save_counts as
  select place_id, count(*)::int as save_count
  from public.saved_places
  group by place_id;

grant select on public.place_save_counts to anon;
grant select on public.place_save_counts to authenticated;
