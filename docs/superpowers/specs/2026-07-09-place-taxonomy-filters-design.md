# Structured scene / ease / best-light filtering — design

## Problem

The map's three curatorial filters ("Best light", "Scene type", "Ease of visit") don't
filter on real data. Scene type substring-matches `place.tags`, ease of visit is inferred at
runtime by keyword heuristics (`accessibilityForPlace`), and best light fuzzy-matches the
free-form `bestTimes[]` through an alias table. Nothing is stored as an explicit, curated
attribute, so "show only places that have the selected value" is not literally true and the
data is never audited.

## Goal

1. Audit all 61 places' tags, descriptions, and best-light for correctness.
2. Promote **scene type**, **ease of visit**, and a filter-grade **best light** to explicit,
   curated fields on every place.
3. Track them on the Supabase catalog so both the seed path and the remote path carry them.
4. Switch the map filters to exact membership on those fields, and surface scene + ease in the
   place UI (prose left intact aside from factual fixes).

## Data model (`lib/types.ts`)

Add to `Place`:

- `sceneTypes: string[]` — each value is one of the canonical scene vocab
  (`landscape`, `skyline`, `coast`, `architecture`, `portraits`, `street`, `bridge`, `color`).
  Invariant: subset of the vocab, so every value is filterable. Multiple allowed.
- `easeOfVisit: "Easy" | "Moderate" | "Difficult"` — one curated value per place.
- `bestLight: string[]` — subset of the light vocab
  (`Golden hour`, `Sunrise`, `Sunset`, `Blue hour`, `Daylight`, `Night`). The descriptive
  `bestTimes[]` is unchanged and still used for display.

## Canonical vocab + pure helpers (`lib/place-taxonomy.ts`, new)

Single source of truth for the vocab and the pure filter logic, moved out of `app/map/page.tsx`:

- `SCENE_OPTIONS` (label + value + icon key), `SCENE_VALUES`, `LIGHT_OPTIONS`, `LIGHT_VALUES`.
- `sceneTypesForPlace(place)` → `place.sceneTypes` if present, else derive from tags (fallback).
- `bestLightForPlace(place)` → `place.bestLight` if present, else derive from `bestTimes` via
  the existing alias mapping (fallback).
- `matchesSceneFilter(place, sceneFilters)`, `matchesBestLightFilter(place, lightFilter)` —
  exact membership predicates.

`lib/place-accessibility.ts` keeps `PlaceAccessibility` / `accessibilityOptions`;
`accessibilityForPlace(place)` now returns `place.easeOfVisit` when set, deriving only as
fallback. Icons stay in the page (lucide components can't live in a pure module); the module
exposes string `icon` keys the page maps to components.

## Map filtering (`app/map/page.tsx`)

Replace the three fuzzy checks with exact ones:

- scene: `matchesSceneFilter(place, sceneFilters)` (was: tag substring)
- light: `matchesBestLightFilter(place, lightFilter)` (was: alias table over bestTimes+photos)
- ease: `accessibilityFilters.includes(accessibilityForPlace(place))` (now field-backed)

Photos inherit their place's scene/light for map filtering. The dead `lightAliases` /
`matchesLightFilter` fuzzy path is removed from the page (its fallback lives in the taxonomy
module).

## UI (prose untouched)

- `place-detail.tsx`: stats row keeps Ease (now field-backed). Add a "Scene" row in Shoot notes
  showing `sceneTypes` mapped to labels.
- `selected-place-card.tsx`: compact scene-labels + ease line under the tag chips.

## Backend (Supabase)

New migration `20260709000100_place_taxonomy_fields.sql` upserts all 61 `kind='place'` catalog
payloads (full `Place` JSON, regenerated from the curated `data.ts` by a `tsx` script so there's
no hand-transcription drift), applied to the remote project. Idempotent upsert on
`(kind, item_id)`.

## Content audit

Go place-by-place through all 61: assign `sceneTypes`, `easeOfVisit`, `bestLight`; fix any
factually wrong tag/description. Applied via a scripted text insertion so existing formatting
and comments are preserved.

## Tests

- Update `lib/place-accessibility.test.ts` for the field-first behavior.
- New `lib/place-taxonomy.test.ts`: exact match predicates + fallback derivation.
- New data-integrity test over `places`: every place has non-empty `sceneTypes ⊆ SCENE_VALUES`,
  `bestLight ⊆ LIGHT_VALUES`, and a valid `easeOfVisit`.
- `tsc --noEmit` + full unit suite.
- Live Playwright on `localhost:3000`: pick a scene, a best-light, and an ease value; confirm
  the result set narrows to exactly the places carrying that value, and that place-detail shows
  the scene + ease from the fields.

## Constraints preserved

- Filter logic stays pure and DOM-free in `lib/` (unit-testable without `mapbox-gl`).
- `sceneTypes` must remain a subset of the eight canonical scene values (enforced by the
  integrity test) so the scene filter can never offer a value no place can match.
