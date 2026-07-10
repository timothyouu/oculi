-- Fix "Security Definer View" advisor error on public.place_save_counts
-- (from 20260710000600_normalize_user_relations.sql).
--
-- A bare view owned by the migration role runs with that role's privileges,
-- which Supabase's linter flags as an implicit SECURITY DEFINER view --
-- exactly the kind of always-bypasses-RLS object this loop has been locking
-- down elsewhere (see 20260710000100/000200 RLS lockdown). Setting
-- `security_invoker = true` would fix the lint but breaks the feature: the
-- whole point of this aggregate is to count saved_places rows across *all*
-- users, and saved_places' RLS is owner-only, so an invoker-scoped view
-- would only ever see the querying user's own saves.
--
-- The safe, intentional escape hatch (same shape Postgres/Supabase
-- recommend for "public aggregate over an RLS-protected table") is a
-- narrowly-scoped SECURITY DEFINER function instead of a view: it only
-- returns a place_id + count aggregate (never which user saved what), has a
-- pinned search_path (avoids the search-path-hijack class of SECURITY
-- DEFINER bugs), and is the only thing granted EXECUTE to anon/authenticated
-- -- unlike public.rls_auto_enable() (see 20260710000100), which had EXECUTE
-- revoked from anon/authenticated specifically because it was never meant
-- to be a public RPC. Here public execution is the intended design.

drop view if exists public.place_save_counts;

create or replace function public.place_save_counts()
returns table (place_id text, save_count int)
language sql
stable
security definer
set search_path = public
as $$
  select place_id, count(*)::int as save_count
  from public.saved_places
  group by place_id;
$$;

revoke all on function public.place_save_counts() from public;
grant execute on function public.place_save_counts() to anon;
grant execute on function public.place_save_counts() to authenticated;
