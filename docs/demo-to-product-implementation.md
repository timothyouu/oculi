# Oculi: Demo → Product Implementation Plan (2026-07-19)

Scope, per Tim: **remaining work only.** The 2026-07-09 audit
(`docs/demo-to-product-audit.md`) and the loop that executed it (`LOOP.md`)
already delivered the infrastructure half of the demo→product path on branch
`audit/demo-to-product`: CI gate, anonymous-first auth with Google OAuth
upgrade, full RLS lockdown, visible persistence failures with retry, a real
`photos` table with defensive hydration, normalized per-user relation tables
with real save counts and real distance, Mapbox proxy rate limiting, and the
map/discover/share/saved e2e suite. Verified baseline at time of writing:
tsc clean, 93/93 unit tests, e2e 10-pass with one known stale spec (item 8).

What's left is a shorter list, and it is a different kind of list: mostly
fictional demo data wearing real UI, plus three unfinished LOOP.md tasks.
Each item below states what is hardcoded/demo-only today (with file
references), what the product needs, concrete steps, and acceptance criteria.
Items marked **DECISION** need Tim's call before implementation.

The LOOP.md verifier applies to every item here: `npx tsc --noEmit`,
`npx vitest run` (count never decreases), `npx next build`,
`npx tsx scripts/verify-db-sync.mts` when seed/DB is touched, live
verification on `localhost:3000`, and anonymous browsing intact after any
migration.

---

## 1. Default-save inflation (LOOP.md Task 6a — decided, queued)

**Today:** `lib/storage.ts` `initialDemoState` seeds every fresh visitor with
four saved places (coit-tower, grace-cathedral, mission-murals,
golden-gate-overlook) and the Task 6 bootstrap reconciler
(`lib/demo-state.tsx`) migrates those untouched defaults into `saved_places`
rows — so those four places' public save counts rise by one per visitor who
never clicked anything.

**Product:** untouched defaults must not create relation rows or move public
counts. Tim already decided this on 2026-07-10; acceptance criteria are
recorded in LOOP.md's 2026-07-10 Codex-takeover entry:

- A fresh visitor who takes no save action creates zero `saved_places` rows
  and zero count increments for the four defaults.
- An explicit save still creates exactly one owner-scoped row and survives
  reload.
- Existing legitimate rows are preserved; granular relation writes and owner
  RLS are unchanged.

**Steps:** teach the bootstrap reconciler to distinguish "still the untouched
initial defaults" from "user state" before migrating saves upward (e.g. only
migrate `savedPlaceIds` entries the user has actually interacted with, or
skip the migration entirely when local state is byte-identical to
`initialDemoState`'s relation arrays). Add unit tests for the reconciler
path; live-verify with a clean browser context (fresh anon visitor → SQL
shows zero rows; then one click → exactly one row).

## 2. Demo-default starting state — **DECIDED 2026-07-19**

**Tim's call:** fresh users keep the pre-populated demo state (4 saved
places, 2 followed users from `lib/storage.ts` `initialDemoState`), with the
requirement that the content behind it — photos, descriptions, and the rest
of the catalog — lives in the database.

**Verified same day against the remote project (`xlzknvhiuhtcqmqrypqh`):**
the requirement already holds. `oculi_demo_catalog_items` carries exactly
61 places / 110 photos / 16 users / 21 areas; an id-set comparison in both
directions returned zero missing and zero unexpected rows, and zero rows
have an empty description/caption/bio or empty `coverPhotoUrl`/`imageUrl`.
The app hydrates from these rows at runtime (`loadRemoteDemoCatalog`,
merged over the bundled seed by id); `scripts/verify-db-sync.mts` local
mode also passed (migration byte-matches `lib/data.ts`).

**Resolved same day:** Tim confirmed he means the database should *own* the
content, not merely mirror `lib/data.ts` — that un-defers item 10, which now
carries the source-of-truth flip. Item 1 still handles the count side of the
defaults.

## 3. Retire the `user-guest` persona

**Today:** `lib/data.ts:3` exports `currentUserId = "user-guest"`, a
fictional seed user that still plays "you" throughout the app even though
real anonymous auth exists: uploads are attributed to it
(`lib/storage.ts` upload records, `lib/demo-state.tsx:474`), photo images
upload to the Storage path `user-guest/<photoId>` (`lib/remote-state.ts:494`),
`lib/remote-route-plans.ts` defaults `user_id` to it, profile pages decide
`isCurrentUser` by comparing against it, and the discover feed filters it out
of suggested photographers.

**Product:** "you" should be the authenticated user (`authUser.id`), with a
display profile the user can edit. `saved-panel.tsx` already made this jump
for route plans under RLS; the rest of the app hasn't.

**Steps:** thread `authUser` (already in `useDemoState`) into the places that
compare against `currentUserId`; attribute new uploads and Storage paths to
`auth.uid()` (the `photos` table already does this via its `owner_id`
default — it's the in-app display attribution and Storage pathing that lag);
map the profile page's "current user" route to the auth identity; keep
`user-guest` only as the author of pre-auth seed content. Audit each of the
~15 `currentUserId` call sites individually — some are display-only, some
are identity-bearing.

**Acceptance:** an upload by a fresh anonymous visitor is displayed as theirs
(and stored under their uid path), their profile page shows their own saves,
and no new row anywhere carries `user-guest`. Seed photos keep their
fictional authors.

## 4. Static seed stats: `followerCount` and seed `saveCount` baselines

**Today:** every seed user's `followerCount` in `lib/data.ts` is a fixed
number (980, 1510, 2480…) that never moves, even though the
`followed_users` table now records real follows. Place `saveCount` got the
real-rows overlay in Task 6 (`seed + real`), but the seed baselines
themselves (e.g. 641 for twin-peaks) are still fiction under a real counter.

**Tim's call (2026-07-19): zero the fictional baselines** — public numbers
become entirely real. Photo `likeCount` seed values (8, 72, …) are the same
class of fiction over a real `liked_photos` table; Tim confirmed same day
that they get zeroed too.

**Steps:** add a `user_follow_counts()` SECURITY DEFINER function mirroring
`place_save_counts()` (same narrow-scope pattern from migration
`20260710000700` — exposes only user_id + count), and a `photo_like_counts()`
sibling; replace (not overlay) the seed numbers at hydration in
`lib/remote-state.ts` — displayed count = real rows only. Zero the baselines
in the database content itself (see item 10, which makes the DB the source
of truth — do the zeroing as part of or after that flip so there's one place
to edit).

**Knock-on work (required, not optional):** `saveCount` is a ranking signal,
not just display. `lib/scoring.ts` orders top places by it and awards the
"Highly saved" badge above 650; `lib/saved-route-planner.ts` folds
`saveCount / 18` into stop scoring; `lib/map-clusters.ts` uses it to pick a
cluster's primary place. On a real-count scale (single digits at first) the
650 threshold means no place is ever "Highly saved" and ordering degenerates
toward ties broken by `recentActivityScore`. Rescale these thresholds/weights
to the real regime (e.g. percentile-based or much lower absolute cutoffs)
in the same change, and update their unit tests deliberately rather than
letting them fail into new numbers.

**Acceptance:** every rendered save/follower/like count equals the real row
count for that entity (SQL-verified for a sampled few), a fresh visitor sees
0s rather than fiction, ordering on `/` and the map still looks sane, and
tsc/unit/e2e stay at baseline (with intentionally-updated scoring tests).

## 5. The `4.8` rating — **DECIDED 2026-07-19: drop it**

**Today:** `components/place-detail.tsx:156` renders a hardcoded `4.8` star
stat for every place — the last survivor of the original "intentional demo
flavor" trio (distance became real in Task 6; save counts became real
overlays).

**Tim's call:** drop the stat, no ratings feature. Implementation: remove
the `Star` stat span (and the now-unused `Star` import if nothing else uses
it) from `place-detail.tsx`. One-line change, queued with the rest of the
work while the loop is paused. Acceptance: no rating renders anywhere, tsc
and the unit/e2e suites stay at baseline.

## 6. Moderation is a dormant column

**Today:** `photos.moderation_status` defaults to `pending`
(migration `20260710000400`), but `loadRemoteDemoCatalog`
(`lib/remote-state.ts:358`) selects it without filtering — every upload
renders publicly the instant it lands, regardless of status. The column is
schema-only.

**Product:** decide the launch posture — realistic minimum is
publish-immediately with after-the-fact review: show `approved` and
`pending` publicly but hide `rejected` (add the filter to the hydration
query, keeping owner visibility of their own rejected photos), plus a
takedown path (item 7's legal stub links to a report/contact address, and
rejecting a photo via SQL/admin is the interim takedown mechanism). A
pre-publication review queue is the stricter alternative but kills the
demo's instant-upload feel. Ship the `rejected` filter regardless; the
posture choice only affects whether `pending` is public.

**Acceptance:** a photo set to `rejected` in SQL disappears from all public
surfaces on next load but remains visible to its owner; uploads still appear
instantly for the uploader.

## 7. Image pipeline (LOOP.md Task 9)

**Today:** 168 hotlinked Wikimedia/Unsplash URLs in `lib/data.ts`, and raw
`<img>` in 8 components (`place-detail.tsx`, `upload-modal.tsx`,
`profile-summary.tsx`, `place-card.tsx`, `app-shell.tsx`, `top-nav.tsx`,
`discover-search.tsx`, `resilient-image.tsx`) — the only remaining lint
warnings. Hotlinking is fragile (remote hosts can break or rate-limit) and
Wikimedia licenses generally require surfaced attribution the UI doesn't
show.

**Product:** `next/image` everywhere (configure `remotePatterns` for the
interim hotlinked hosts; mind that `resilient-image.tsx`'s fallback behavior
must survive the swap); longer-term, mirror seed media into the
`oculi-photos` bucket/CDN with per-image attribution metadata
(photographer/license/source added to the `Photo` seed shape) rendered where
the license requires it. Regenerate the catalog migration afterward
(`scripts/gen-taxonomy-migration.mts`) and run `verify-db-sync`.

**Acceptance:** zero `<img>` lint warnings, LCP not regressed on `/` and
`/places/[id]`, attribution visible on Wikimedia-sourced photos, e2e suite
still at baseline.

## 8. Legal stub pages (LOOP.md Task 12→Task 10, reduced scope)

**Today:** no `/terms` or `/privacy` routes exist at all, while the app
already accepts public uploads from anonymous users.

**Product (reduced per Tim's 2026-07-09 decision):** minimal static
`/terms` and `/privacy` stub pages, linked from the app shell footer or
settings, including a contact/report address that doubles as item 6's
takedown intake. Not legal advice — placeholder copy clearly labeled as
such, upgraded before any real launch.

## 9. Stale `saved-route-planner` e2e spec (LOOP.md Task 11)

**Today:** `e2e/saved-route-planner.spec.ts` predates the 38f6d03
drag-reorder refactor and is the suite's only failure (10 pass + this one).

**Product:** rewrite the spec against the current drag-reorder UI so the e2e
suite is green and CI can enforce it. Acceptance: full Playwright suite
passes; no existing assertions weakened elsewhere.

## 10. Catalog lives in code (audit item 4 — **UN-DEFERRED 2026-07-19**)

**Tim's call:** move the `lib/data.ts` content into the database for real —
the database becomes the single source of truth where all the info is held.
This reverses the 2026-07-09 deferral.

**Today:** `lib/data.ts` (61 places, 110 photos, 16 users, 21 areas) is the
editing source of truth, compiled into migrations by scripts; the DB mirrors
it (verified in sync on 2026-07-19, item 2) and hydration merges DB rows
*over* the bundled seed, with the seed as initial paint and offline
fallback. `scripts/verify-db-sync.mts` guards code↔DB drift.

**Steps, in order:**

1. **Final sync + baseline zeroing.** With the sync guard still active, do
   the item-4 zeroing (saveCount/followerCount/likeCount → 0) as one last
   coordinated data.ts + migration + DB update, then confirm
   `verify-db-sync` passes one final time. From here on the DB copy is
   canonical.
2. **Flip hydration to DB-authoritative.** `loadRemoteDemoCatalog` stops
   merging over `seedCatalog` as a peer and treats DB rows as the catalog;
   `lib/demo-state.tsx` replaces the `seedCatalog` initial render with a
   lightweight loading state (or a build-time snapshot used strictly as
   first-paint/offline cache, clearly marked non-authoritative). The
   defensive validators in `lib/catalog-validation.ts` stay on every row —
   they matter *more* once the DB is the only source.
3. **Demote `lib/data.ts`.** Reduce it to (a) the one-time seed consumed by
   migrations for a fresh environment and (b) nothing else — no runtime
   imports of place/photo/user/area content outside the seed path.
   `currentUserId` moves out (item 3 retires it anyway).
   `scripts/gen-taxonomy-migration.mts` becomes a seed-bootstrap tool;
   `scripts/verify-db-sync.mts` is retired or inverted (its data.ts-equality
   premise no longer holds) — since it's LOOP.md-locked, retiring it is a
   Tim-approved spec change, recorded here.
4. **Content editing path.** Interim: SQL/Supabase dashboard edits against
   the catalog table (RLS already makes it client-read-only, so writes are
   dashboard/service-role only). Real: a minimal admin flow — place editor
   enforcing the `lib/place-taxonomy.ts` vocab constraints (`sceneTypes ⊆
   SCENE_VALUES`, `bestLight ⊆ LIGHT_VALUES`, `easeOfVisit` enum) at the
   API layer, since the catalog integrity unit test over `data.ts` stops
   guarding live content after the flip. Port that integrity check to a
   runtime/CI check that queries the DB.

**Acceptance:** the app renders the full catalog with the bundled seed
content deleted or demoted (verifiable by editing one place description in
the DB alone and seeing it live without a deploy); fresh-environment
bootstrap from migrations still works; validators still reject a malformed
row; tsc/unit/e2e at baseline with tests intentionally updated for the new
hydration path.

---

## Non-issues checked and cleared this pass

- `app/api/mapbox/route.ts:46`'s `http://localhost:3000/` fallback referrer
  is a dev-only retry path, fine as-is.
- Nav notifications (`top-nav.tsx`) are derived from real followed/liked
  state, not seeded fiction.
- `place-detail.tsx` distance and place save counts are real (Task 6).
- All demo-era always-true RLS, catalog write paths, and bucket listing were
  closed in Tasks 3/5; advisors were clean at last check.

## Suggested order

Item 1 first (decided, small, stops a live count distortion), then 5's
one-line rating removal (decided) and 9 (small, makes CI fully green), then
3 (identity correctness — touches many call sites, wants the green suite
first). Then the newly un-deferred 10 together with 4 as one arc — the
zeroing is step 1 of the source-of-truth flip, and doing 10 before 4's
count-replacement work means the counts get edited in exactly one place.
Items 7 and 8 remain independent afternoon-sized tasks that can interleave;
6 last. As of 2026-07-19 every decision in this document is made (items 2,
4, 5 decided; 10 un-deferred; photo `likeCount` zeroing confirmed by Tim).

Per LOOP.md's stop rule the loop itself remains paused; this document plans
the work but does not dispatch it.
