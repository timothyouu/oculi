# Oculi

Oculi is a map-first photo-spot discovery and shoot-planning product that originated as a Codex summer challenge demo. Browse places, filter and search a live map, save favorites, publish photos, and build a timed route for a morning or sunset shoot.

I built this with Codex doing the heavy lifting on implementation. I set the product direction and made the calls on scope and design, and Codex wrote the majority of the app: the Next.js routes, the map integration, the Supabase-backed persistence, and the route planner logic.

## What it does

The app opens straight into a photo feed, no onboarding. From there you can browse a discover deck of photo spots, drop into a live Mapbox map to see them geographically, tap into a place detail page for photos and shoot notes, and save spots you want to come back to.

The Saved page is the part I'm proudest of. It turns your saved places into a shoot-planning workspace: pick a morning route or a sunset route, and it recommends stops with arrival times, shoot notes, and one-tap links out to Google Maps or Apple Maps. Oculi isn't trying to be a turn-by-turn navigation app, it just answers "where should I go, when should I get there, and what do I open in Maps."

## Stack

- Next.js 16 (App Router) with React 19
- Tailwind CSS
- Mapbox GL JS for the live map, with a stylized SVG fallback when there's no token or Mapbox rejects auth
- Supabase for persistence
- Vitest for unit tests, Playwright for end-to-end tests

## Project layout

- `app/` – route handlers and pages: `map/`, `places/`, `profile/`, `saved/`, plus an `api/mapbox` proxy that forwards Mapbox requests with a controlled referrer so referrer-restricted tokens work server-side
- `components/` – UI, including the live map orchestration (`mapbox-map.tsx`), its fallback (`stylized-map.tsx`), and the shoot route planner (`saved-panel.tsx`)
- `lib/` – the pure logic: marker clustering, the fallback decision between live map and stylized map, place accessibility scoring, search ranking, and the saved-route planner, each with unit tests alongside the module
- `e2e/` – Playwright specs
- `supabase/` – Supabase project config and migrations

## Running it locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for authentication and persistence. Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` for the live map; without it, Oculi uses the stylized fallback so the rest of the product remains usable.

```bash
npm run test:unit   # Vitest unit tests
npm run test        # Playwright e2e tests
npm run typecheck
npm run lint
npm run build
npm run verify:db-sync
```

## Release notes

- Saved counts come from owner-scoped relation tables and a public aggregate function; distance is calculated from browser geolocation when permission is granted.
- New photo uploads remain pending and owner-visible until manually approved through the Supabase moderation field.
- Seed catalog data is versioned in `lib/data.ts`, hydrated from Supabase at runtime, and guarded against drift by `npm run verify:db-sync`.
- CI runs typecheck, unit tests, production build, lint, and catalog-sync verification. Playwright covers the high-risk browser flows locally.
