# Oculi: Demo → Product Audit (2026-07-09)

Baseline at audit time: `tsc --noEmit` clean, 47/47 unit tests pass, `next build`
succeeds, lint has only `<img>` warnings. The catalog-sync issues found were fixed
in this session's loop (see `LOOP.md`); one migration-history fix needs Tim
(see "Your steps" in the session report).

## Fixed this session
- **User catalog drift**: remote `oculi_demo_catalog_items` had 6 stale user
  payloads (old Unsplash avatars) and the pre-rename `user-tim` identity instead
  of `user-guest`. Synced all 16 users from `lib/data.ts`, removed the stale row.
  Verified: jsonb comparison returns zero mismatches; photos/areas/places spot-verified in sync.
- **New locked verifier**: `scripts/verify-db-sync.mts` — checks data.ts ↔ taxonomy
  migration byte-equality and emits per-kind SQL that must return zero rows against
  the remote. Run it whenever seed data changes.

## P0 — product blockers (in order)

1. **Real authentication.** Everyone is an anonymous `visitor-<uuid>` (client-generated)
   or the hardcoded `user-guest`; identity lives in localStorage. Product needs Supabase
   Auth (email/OAuth), `auth.uid()`-keyed rows, and a merge path from visitor state to
   a real account.

2. **Lock down the database.** Supabase security advisors flag 11 always-true RLS
   policies: INSERT/UPDATE on `oculi_demo_catalog_items` and INSERT/UPDATE/DELETE on
   `oculi_demo_states`, `route_plans`, `route_plan_stops` are all `USING (true)` —
   any anonymous client can overwrite anyone's state, the shared catalog, or delete
   route plans. Also: the public `oculi-photos` bucket allows listing all files, and
   `public.rls_auto_enable()` is a SECURITY DEFINER function executable by `anon`.
   All of this is fine for a demo, none of it survives real users.

3. **Separate user content from the seed catalog.** `saveRemoteCatalogPhoto` upserts
   user uploads (`upload-*`) into the same `oculi_demo_catalog_items` table as seed
   data, with a client-built payload and no validation or ownership column. Product
   needs a real `photos` table (owner FK, created_at, moderation status), server-side
   validation, and a content-moderation step before uploads go public.

4. **Flip the data source of truth.** Today `lib/data.ts` (61 places, 110 photos,
   16 users, 21 areas) is the source of truth, compiled into migrations by scripts.
   That's a demo pattern — every content edit is a code deploy. Product: the database
   owns content, the app reads it (`loadRemoteCatalog` already exists), and curation
   happens through an admin flow. Until then, `scripts/verify-db-sync.mts` is the
   guard against silent drift (that's how this session's mismatch was caught).

## P1 — correctness and robustness

5. **Silent persistence failures.** Every Supabase write in `lib/remote-state.ts`
   fails with only a `console.warn` — the user never learns a save/like/route didn't
   persist. Needs user-visible failure states plus retry or an offline queue.

6. **Whole-state blob writes.** The entire `DemoState` is upserted as one JSON blob
   per visitor on change: last-write-wins across tabs/devices, and it grows unboundedly
   (`viewedPhotoIds`). Normalize into per-entity tables (saves, likes, views) once auth
   exists — this also makes `saveCount` real (see 7).

7. **Hardcoded demo numbers.** The `4.8` rating and `0.3 mi` distance in
   `place-detail.tsx` and static `saveCount` in seed data are intentional demo flavor
   (documented in CLAUDE.md). For product: real aggregate saves (derivable once 6 is
   done), real distance from geolocation (haversine already exists in `lib/geo.ts`),
   and either a ratings feature or drop the stat.

8. **Mapbox proxy hardening.** `app/api/mapbox/route.ts` is host-pinned to
   `api.mapbox.com` (good) but has no rate limiting or caching, and the token is
   `NEXT_PUBLIC_` (client-visible) anyway. Decide: server-only token with URL
   restrictions + per-IP rate limits on the proxy, and Mapbox usage alerts, or drop
   the proxy and use a referrer-restricted public token directly.

## P2 — quality, scale, polish

9. **Test coverage is lib-only.** 47 unit tests all live in `lib/`; only 2 Playwright
   specs (upload, route planner). No coverage for: map fallback decision in-browser,
   discover-deck resume, share, saved-state persistence round-trip, or the API route.
   The regression history in CLAUDE.md shows the map is the riskiest surface — add
   e2e specs for map camera/cluster/fallback behaviors.

10. **Image pipeline.** Lint flags raw `<img>` in `place-detail.tsx` and
    `upload-modal.tsx` (LCP cost); seed photos hotlink Wikimedia/Unsplash. Product:
    `next/image` everywhere, media served from own storage/CDN with attribution
    metadata where licenses require it (Wikimedia images need attribution surfaced).

11. **Operations.** No error monitoring, no analytics, no CI gate running
    typecheck/unit/e2e (only the Supabase preview check). Wire GitHub Actions to run
    the four baseline verifiers plus `verify-db-sync` on every PR.

12. **Product/legal basics for public launch.** Terms + privacy policy (required once
    uploads and accounts exist), content licensing for place descriptions, and a
    takedown path for uploaded photos.

## Suggested order of attack
Auth (1) unlocks RLS (2), which unlocks real user content (3) and normalized state
(6→7). The Mapbox and ops items (8, 11) are afternoon-sized and can go anytime.
Everything in P0 is a prerequisite for letting strangers use the app with real
accounts; P1 is what makes it trustworthy; P2 is what makes it maintainable.
