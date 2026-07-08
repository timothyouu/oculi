# Oculi

Oculi is a photo-spot discovery app I built for the Codex summer challenge. It's a map-first experience for finding, saving, and planning photography shoots: browse places on a live Mapbox map, filter and search them, save your favorites, and let the app put together a shoot route for the day.

I built this with Codex doing the heavy lifting on implementation. I set the product direction and made the calls on scope and design, and Codex wrote the majority of the app: the Next.js routes, the map integration, the Supabase-backed persistence, and the route planner logic.

## What it does

The app opens straight into a photo feed, no onboarding. From there you can browse a discover deck of photo spots, drop into a live Mapbox map to see them geographically, tap into a place detail page for photos and shoot notes, and save spots you want to come back to.

The Saved page is the part I'm proudest of. It turns your saved places into a shoot-planning workspace: pick a morning route or a sunset route, and it recommends stops with arrival times, shoot notes, and one-tap links out to Google Maps or Apple Maps. Oculi isn't trying to be a turn-by-turn navigation app, it just answers "where should I go, when should I get there, and what do I open in Maps."

## Stack

- Next.js 14 (App Router) with React 18, functional components and hooks only
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
npm install
npm run dev
```

You'll need a Mapbox token for the live map. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. Without it, the app falls back to a stylized map so the rest of the experience still works.

```bash
npm run test:unit   # Vitest unit tests
npm run test        # Playwright e2e tests
npm run typecheck
npm run lint
```

## Notes on the build

A few of the numbers on the place detail page, like the star rating and distance, are hardcoded demo placeholders since there's no real rating or geolocation data source wired up yet. Everything else, like saved counts, photo counts, and the route planner, reads from real app state.
