-- RLS lockdown, step 2 of 2 (docs/demo-to-product-audit.md item 2).
--
-- Drops the 11 always-true write policies (and the always-true SELECT on
-- oculi_demo_states, which the advisor doesn't flag but the design here
-- tightens too) now that the owner-scoped replacements from
-- 20260710000100_rls_lockdown_add_owner_policies.sql have been verified
-- live against the remote project with both an anon key (no session) and a
-- real anonymous-auth session.
--
-- Known accepted consequence: the auth bootstrap's legacy visitor-row merge
-- read (lib/demo-state.tsx, loadRemoteDemoState(legacyVisitorId)) will now
-- fail RLS for any legacy visitor-<uuid>/user-guest row that isn't the
-- caller's own auth.uid() -- that call already has a .catch, so it fails
-- silently and the merge just contributes nothing, per the audit design.

drop policy if exists "Allow demo state reads" on public.oculi_demo_states;
drop policy if exists "Allow demo state writes" on public.oculi_demo_states;
drop policy if exists "Allow demo state updates" on public.oculi_demo_states;
drop policy if exists "Allow demo state deletes" on public.oculi_demo_states;

drop policy if exists "Allow demo route plan reads" on public.route_plans;
drop policy if exists "Allow demo route plan inserts" on public.route_plans;
drop policy if exists "Allow demo route plan updates" on public.route_plans;
drop policy if exists "Allow demo route plan deletes" on public.route_plans;

drop policy if exists "Allow demo route stop reads" on public.route_plan_stops;
drop policy if exists "Allow demo route stop inserts" on public.route_plan_stops;
drop policy if exists "Allow demo route stop updates" on public.route_plan_stops;
drop policy if exists "Allow demo route stop deletes" on public.route_plan_stops;

drop policy if exists "Allow demo catalog writes" on public.oculi_demo_catalog_items;
drop policy if exists "Allow demo catalog updates" on public.oculi_demo_catalog_items;
-- "Allow public demo catalog reads" (SELECT true) is intentionally kept --
-- the shared catalog is the demo, per docs/demo-to-product-audit.md item 3.
