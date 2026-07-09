# Share-a-place popover — design

## Purpose

On the map, selecting a location opens the `SelectedPlaceCard`, whose bottom-right
`Send` button currently does nothing. Wire that button (and the identical
placeholder `Share` button on the place-detail view) up to a real share action:
a small popover offering **Copy link**, a **native Share…** row (when the browser
supports it), and a few social targets (X, WhatsApp, Email). No new dependencies,
no toast library — feedback stays inline, matching the app's existing convention.

## Scope

- Map: `components/selected-place-card.tsx` — the `Send` button becomes the share trigger.
- Place detail: `components/place-detail.tsx` — the `Share` button becomes the share
  trigger, replacing its fake `setActionStatus("Share card ready…")` behavior.
- Both reuse one popover component and one pure helper.

Out of scope: sharing photos, sharing routes, share analytics, deep-link params
beyond the existing `/places/[placeId]` route.

## Architecture — three pieces

### 1. `lib/share-place.ts` (pure, unit-tested)

No DOM, no side effects. Given a `Place` and an `origin` string:

- `buildPlaceShareUrl(place: Place, origin: string): string`
  → `${origin}/places/${place.id}`. The `/places/[placeId]` route already exists.
- `buildPlaceSharePayload(place: Place, origin: string): { title: string; text: string; url: string }`
  - `title` = `place.name`
  - `text` = `` `${place.name} — ${place.fuzzyLocationLabel} · a photo spot on Oculi` ``
    (fall back to just `place.name` when `fuzzyLocationLabel` is empty)
  - `url` = `buildPlaceShareUrl(...)`
- `buildPlaceShareTargets(payload): ShareTarget[]` where
  `ShareTarget = { id: "x" | "whatsapp" | "email"; label: string; href: string }`.
  Ordered: X, WhatsApp, Email. Each `href` is built with `encodeURIComponent`:
  - X: `https://twitter.com/intent/tweet?text={text}&url={url}`
  - WhatsApp: `https://wa.me/?text={text + " " + url}`
  - Email: `mailto:?subject={title}&body={text + "\n\n" + url}`

Encoding is the part most likely to break, so it is the part that gets tests.

### 2. `components/share-place-popover.tsx` (client component)

The only piece that touches browser APIs.

Props:
```ts
type SharePlacePopoverProps = {
  place: Place;
  className?: string;          // applied to the trigger button
  triggerLabel?: string;       // aria-label, defaults to `Share ${place.name}`
  icon: ReactNode;             // caller passes <Send/> or <Share/> to match its surface
  align?: "left" | "right";    // which edge the popover anchors to (default "right")
};
```

Behavior:
- Renders the trigger button (with the passed `icon`) plus a popover panel shown
  when `open`.
- `origin` is read from `window.location.origin` inside a click/effect handler,
  guarded so it is never read during SSR.
- Panel rows:
  - **Copy link** → `navigator.clipboard.writeText(url)`; on success the row label
    flips to `Copied ✓` for ~1.8s. On failure (no clipboard API), it reveals the
    raw URL as selectable text so the user can copy manually.
  - **Share…** (native) → only rendered when `typeof navigator !== "undefined" &&
    !!navigator.share`; calls `navigator.share(payload)`. Swallows `AbortError`
    (user dismissed the sheet).
  - Social targets from `buildPlaceShareTargets` rendered as
    `<a target="_blank" rel="noopener noreferrer">`.
- Dismissal: outside pointer-down and `Escape` both close it. Trigger carries
  `aria-haspopup="menu"` and `aria-expanded`. On open, focus moves to the first
  row; on close, focus returns to the trigger.
- Styling matches existing cards: `border border-[var(--line)]`, white panel,
  rounded-lg, soft shadow. Panel is absolutely positioned relative to the trigger
  wrapper and anchored per `align`.

### 3. Wire-ups (no new logic)

- `components/selected-place-card.tsx`: replace the dead `Send` button (lines
  ~173–175) with `<SharePlacePopover place={place} icon={<Send className="size-5" />}
  align="right" className="grid size-12 place-items-center rounded-lg border
  border-[var(--line)] bg-white text-[var(--ink)]" />`. Keep the grid cell it lives in.
- `components/place-detail.tsx`: replace the `Share` button's `onClick`
  (lines ~92–99) with `<SharePlacePopover place={place} icon={<Share className="size-5" />}
  align="right" className="grid size-14 place-items-center rounded-lg border
  border-[var(--line)] bg-white" />`. Drop the now-unused share `setActionStatus`
  call; leave the "More actions" button and `actionStatus` state intact (still used
  by the More button).

## Data flow

`place` → helper builds `{ url, payload, targets }` → popover renders `targets`
as links and handles copy/native-share as side effects. `origin` supplied at
interaction time from `window.location.origin`.

## Error handling

- No clipboard API → fall back to showing selectable URL text (no throw).
- `navigator.share` rejects with `AbortError` → silently ignored.
- SSR / no `window` → popover renders trigger only; `origin`-dependent work is
  deferred to client interaction, so nothing reads `window` during render.

## Testing

- Unit (`lib/share-place.test.ts`): URL shape; payload title/text incl. the
  empty-`fuzzyLocationLabel` fallback; each social `href` contains the correctly
  `encodeURIComponent`-encoded url and text; target order is X, WhatsApp, Email.
- Live (Playwright, `localhost:3000`): select a place on the map, click `Send`,
  popover opens, click **Copy link**, assert `navigator.clipboard.readText()`
  equals `${origin}/places/{id}` and the row shows `Copied ✓`. Repeat on the
  place-detail `Share` button. (Note the CLAUDE.md constraint: the Mapbox
  token/referrer setup is tied to port 3000 specifically.)

## Constraints honored

- Functional components + hooks only; TypeScript strict, all signatures typed.
- Share/URL logic kept pure in `lib/` so it is unit-testable without a DOM.
- No new npm dependency; no toast infra introduced.
- Follows the existing inline-status-string feedback convention.
