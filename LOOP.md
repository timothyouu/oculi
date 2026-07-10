# Oculi DB-Sync Fix Loop

## Goal
Make the remote Supabase project (`xlzknvhiuhtcqmqrypqh`) exactly mirror
`lib/data.ts` for seed catalog data, and realign migration history so the
Supabase GitHub Preview check passes.

## Modifiable
- Remote rows in `public.oculi_demo_catalog_items` with `kind='user'` (seed users only).
- Remote `supabase_migrations.schema_migrations` version realignment
  (documented precedent: 2026-07-08 fix in CLAUDE.md).

## NOT modifiable (locked)
- `scripts/verify-db-sync.mts` (the verifier)
- `lib/data.ts` (source of truth)
- `supabase/migrations/*` files
- Runtime data: `upload-%` photo rows, `oculi_demo_states`, route plans.

## Verifier (all must pass)
1. `npx tsx scripts/verify-db-sync.mts` exits 0.
2. The user-kind comparison SQL emitted by the verifier returns **zero rows**.
3. `list_migrations` versions exactly match local `supabase/migrations/` filenames.

## Stop rules
- Success: all three verifier checks pass.
- Budget: max 3 iterations.
- Circuit breaker: the same check failing twice in a row → stop, report to Tim.

## Known failures at loop start (baseline)
- Remote migration version `20260709191757` has no matching local file
  (local: `20260709000100_place_taxonomy_fields.sql`).
- kind='user': 6 payloads stale (`user-guest` missing; unsplash avatars on
  isha/jules/lena/nora/sam), 1 stale extra (`user-tim`).

## Progress log
- Iteration 1 (2026-07-09): upserted all 16 users from data.ts, deleted stale
  `user-tim` row. Verify: user comparison SQL → zero rows ✓; verify-db-sync.mts
  exit 0 ✓. Migration realignment SQL was DENIED by the permission classifier —
  handed to Tim as a manual step (circuit breaker: not retried).
- Iteration 2 (2026-07-09, Tim-authorized): realigned remote migration version
  `20260709191757` → `20260709000100`. Verify: `list_migrations` now matches all
  7 local filenames exactly ✓.
- Result: CONVERGED. All three verifier checks pass; loop closed.
