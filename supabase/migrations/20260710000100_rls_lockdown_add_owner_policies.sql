-- RLS lockdown, step 1 of 2 (docs/demo-to-product-audit.md item 2).
--
-- Adds owner-scoped policies alongside the existing always-true demo
-- policies on oculi_demo_states / route_plans / route_plan_stops /
-- oculi_demo_catalog_items. Postgres RLS is an OR of permissive policies,
-- so the old `true` policies still govern access until they are dropped in
-- the follow-up migration (20260710000200) -- this step is purely additive
-- so app behavior can be verified before anything is tightened.
--
-- Also locks two lower-risk findings immediately since neither is on any
-- exercised app path: bucket listing on storage.objects for oculi-photos
-- (public buckets serve objects via an unauthenticated public-URL route
-- that does not consult this SELECT policy at all -- see Supabase docs
-- "Storage Buckets" / Access model -- so dropping it cannot break
-- getPublicUrl reads, only .list()), and anon/authenticated EXECUTE on the
-- SECURITY DEFINER function public.rls_auto_enable().

-- --- oculi_demo_states: owner-only policies (auth.uid() as text) ---
create policy "Owner can read demo state"
  on public.oculi_demo_states
  for select
  to authenticated
  using (user_id = (select auth.uid())::text);

create policy "Owner can insert demo state"
  on public.oculi_demo_states
  for insert
  to authenticated
  with check (user_id = (select auth.uid())::text);

create policy "Owner can update demo state"
  on public.oculi_demo_states
  for update
  to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);

create policy "Owner can delete demo state"
  on public.oculi_demo_states
  for delete
  to authenticated
  using (user_id = (select auth.uid())::text);

-- --- route_plans: owner-only policies (user_id already exists, text) ---
create policy "Owner can read route plans"
  on public.route_plans
  for select
  to authenticated
  using (user_id = (select auth.uid())::text);

create policy "Owner can insert route plans"
  on public.route_plans
  for insert
  to authenticated
  with check (user_id = (select auth.uid())::text);

create policy "Owner can update route plans"
  on public.route_plans
  for update
  to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);

create policy "Owner can delete route plans"
  on public.route_plans
  for delete
  to authenticated
  using (user_id = (select auth.uid())::text);

-- --- route_plan_stops: ownership via EXISTS join to the owning plan ---
create policy "Owner can read route plan stops"
  on public.route_plan_stops
  for select
  to authenticated
  using (
    exists (
      select 1 from public.route_plans p
      where p.id = route_plan_stops.route_plan_id
        and p.user_id = (select auth.uid())::text
    )
  );

create policy "Owner can insert route plan stops"
  on public.route_plan_stops
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.route_plans p
      where p.id = route_plan_stops.route_plan_id
        and p.user_id = (select auth.uid())::text
    )
  );

create policy "Owner can update route plan stops"
  on public.route_plan_stops
  for update
  to authenticated
  using (
    exists (
      select 1 from public.route_plans p
      where p.id = route_plan_stops.route_plan_id
        and p.user_id = (select auth.uid())::text
    )
  )
  with check (
    exists (
      select 1 from public.route_plans p
      where p.id = route_plan_stops.route_plan_id
        and p.user_id = (select auth.uid())::text
    )
  );

create policy "Owner can delete route plan stops"
  on public.route_plan_stops
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.route_plans p
      where p.id = route_plan_stops.route_plan_id
        and p.user_id = (select auth.uid())::text
    )
  );

-- --- oculi_demo_catalog_items: shared catalog stays publicly readable;
--     writes are restricted to the runtime upload path (saveRemoteCatalogPhoto
--     upserts kind='photo', item_id='upload-<uuid>'). No DELETE policy
--     existed before and none is added now -- clients can never delete
--     catalog rows. ---
create policy "Authenticated can insert photo uploads"
  on public.oculi_demo_catalog_items
  for insert
  to authenticated
  with check (kind = 'photo' and item_id like 'upload-%');

create policy "Authenticated can update photo uploads"
  on public.oculi_demo_catalog_items
  for update
  to authenticated
  using (kind = 'photo' and item_id like 'upload-%')
  with check (kind = 'photo' and item_id like 'upload-%');

-- --- storage.objects: drop the broad public SELECT policy on oculi-photos.
--     Individual object reads keep working via the public bucket's
--     unauthenticated public-URL route; only .list()/authenticated-download
--     capability is removed. ---
drop policy if exists "Allow public demo photo reads" on storage.objects;

-- --- rls_auto_enable(): SECURITY DEFINER event-trigger helper, not meant
--     to be a public RPC endpoint. Revoke EXECUTE from anon/authenticated
--     (PUBLIC grants would otherwise flow through to both). ---
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
grant execute on function public.rls_auto_enable() to postgres;
grant execute on function public.rls_auto_enable() to service_role;
