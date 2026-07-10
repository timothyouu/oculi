# Oculi Demo→Product Audit Loop (2026-07-09)

## Mission
Work through `docs/demo-to-product-audit.md` one task at a time until every
in-scope item is done and verified. Fable 5 orchestrates (plans, dispatches,
measures — never implements); Sonnet 5 subagents execute scoped goals.

## Decisions already made (do not re-litigate)
- Tim + board approved 2026-07-09 (see COUNCIL.md log):
  - **Auth**: anonymous-first — Supabase anonymous sign-ins for every visitor
    (no login wall, demo stays frictionless), optional upgrade to a real
    account via **Google OAuth** (`linkIdentity`). No magic link, no password.
  - **Package**: `@supabase/ssr` approved (Tim runs the install himself).
  - **DB risk**: apply migrations directly to the live project
    (`xlzknvhiuhtcqmqrypqh`), additively sequenced (add new policies before
    dropping permissive ones), verify anonymous browsing after each migration.
  - **Scope**: audit item 4 (DB as source of truth) DEFERRED; item 12 reduced
    to a stub page. Everything else in scope.

## Task order (board-adjusted)
1. **CI gate** (audit #11) — GitHub Actions: tsc, vitest, next build, lint,
   verify-db-sync on every PR/push. This becomes the loop's outer verifier.
2. **Anonymous-first auth** (audit #1) — anon sessions replace `visitor-<uuid>`,
   Google OAuth account upgrade, state merge via identity linking.
3. **RLS lockdown** (audit #2) — replace 11 always-true policies with
   auth.uid()-keyed ones; fix bucket listing; lock `rls_auto_enable()`.
4. **Visible persistence failures** (audit #5) — surface failed Supabase writes
   to the user with retry.
5. **Real photos table** (audit #3) — user uploads out of the seed catalog:
   owner FK, created_at, validation.
6. **Normalized state** (audit #6+#7) — per-entity saves/likes/views tables;
   real saveCount; real distance.
7. **Mapbox hardening** (audit #8) — decide proxy vs direct token; rate limit.
8. **E2E coverage** (audit #9) — Playwright specs for map camera/cluster/
   fallback, discover resume, share, saved round-trip.
9. **Image pipeline** (audit #10) — next/image everywhere, attribution surfaced.
10. **Legal stub** (audit #12) — minimal /terms and /privacy stub pages.

## Modifiable
- The `audit/demo-to-product` branch of this repo (never main).
- Remote Supabase project via new migration files (additive sequencing).

## NOT modifiable (locked)
- `scripts/verify-db-sync.mts`, existing test files (subagents may ADD tests,
  never weaken/delete existing ones), `docs/demo-to-product-audit.md` (the
  spec), this file's Mission/Decisions sections (orchestrator appends to the
  progress log only).

## Verifier (every task must pass ALL before it counts)
1. `npx tsc --noEmit` exits 0.
2. `npx vitest run` — all tests pass, count never decreases.
3. `npx next build` succeeds.
4. `npx tsx scripts/verify-db-sync.mts` exits 0 (when seed/DB touched).
5. Task-specific acceptance criteria written in the dispatch goal, verified by
   the orchestrator with evidence (Playwright against localhost:3000, SQL
   against the remote, or reading the diff) — never the subagent's word.
6. After any DB migration: anonymous browsing of the live app still works.

## Stop rules
- Success: all 10 tasks verified done.
- Circuit breaker: same task fails verification twice → stop rerunning,
  re-plan or escalate tier; same task fails twice AFTER re-plan → stop the
  loop and report to Tim.
- Any guard-hook denial → don't retry; collect as a "Your steps" item for Tim.
- Budget: pause and report to Tim after task 6 (end of P0/P1) regardless.

## Tim's pending manual steps (collected as found)
- [ ] `! npm install @supabase/ssr` (in ~/oculi) — needed before task 2 code compiles.
- [ ] Enable **anonymous sign-ins**: Supabase dashboard → Authentication →
      Sign In / Up → allow anonymous sign-ins (project xlzknvhiuhtcqmqrypqh).
- [ ] Create **Google OAuth credentials** (Google Cloud Console → OAuth client,
      redirect URL from Supabase dashboard → Auth → Providers → Google) and
      paste client id/secret into the Supabase Google provider config.

## Progress log (append-only)
- 2026-07-09: Loop initialized. Branch `audit/demo-to-product` created off main
  (2821e31). Previous DB-sync loop archived to docs/loops/. Baseline verified:
  tsc clean, 47/47 tests, build OK.
- 2026-07-09: Task 1 (CI gate) DONE, first try. Sonnet subagent added
  `.github/workflows/ci.yml` (tsc, vitest, build, lint, verify-db-sync local
  mode — remote SQL mode deliberately excluded from CI, needs credentials).
  Orchestrator re-ran all five steps locally: exit 0 each. Task 2 (auth) is
  blocked on Tim's three manual steps (see checklist above); proceeding to
  Task 4 (visible persistence failures) meanwhile — independent of auth.
