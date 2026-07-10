-- Real `photos` table for user uploads (docs/demo-to-product-audit.md item 3).
--
-- User photo uploads (id `upload-*`) currently live in the shared seed
-- catalog table (`oculi_demo_catalog_items`, kind='photo'), upserted by
-- `saveRemoteCatalogPhoto` with a client-built payload, no ownership column,
-- and no server-side validation beyond the jsonb column type. This table
-- gives uploads a real home: an owner FK, real typed/validated columns, and
-- a moderation_status for a future moderation step (not gated on yet -- the
-- owner can always see their own upload regardless of status, per design).
--
-- `id` stays `text` (not uuid) so existing `upload-<uuid>` string ids keep
-- working unchanged -- lib/demo-state.tsx's `makeId("upload")` already
-- produces `upload-<uuid>`, and this table's INSERT policy below enforces
-- that prefix.
--
-- `owner_id` is nullable: new inserts default it to the inserting session's
-- auth.uid() (every visitor has a real session by the time this ships, see
-- audit item 1), but the migration in
-- 20260710000500_migrate_upload_photos_to_photos_table.sql backfills the
-- one pre-auth legacy upload row, which has no real session to attribute --
-- that row's owner_id is left NULL rather than invented.

create table public.photos (
  id text primary key,
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  place_id text not null,
  caption text,
  image_url text not null,
  tags text[] not null default '{}',
  shot_at_time_of_day text,
  location_label text,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected'))
);

comment on table public.photos is
  'Real user photo uploads, separated from the shared seed catalog (oculi_demo_catalog_items). Owner-scoped writes, public reads. See docs/demo-to-product-audit.md item 3.';

alter table public.photos enable row level security;

-- Public read: uploaded photos are public content in this product, same as
-- the seed catalog. Moderation status gates UI presentation later, not raw
-- table access -- the owner must always be able to see their own upload
-- regardless of moderation_status, which a SELECT-time status filter would
-- break for the owner's own pending/rejected rows.
create policy "Anyone can read photos"
  on public.photos
  for select
  to public
  using (true);

-- Insert: only authenticated (anonymous-or-real) sessions, only attributing
-- themselves as owner, only using the app's upload-id convention.
create policy "Authenticated can insert own photos"
  on public.photos
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and id like 'upload-%'
  );

-- Update/delete: owner-only.
create policy "Owner can update own photos"
  on public.photos
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owner can delete own photos"
  on public.photos
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));
