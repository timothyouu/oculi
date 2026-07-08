# Saved Page Route Planner Spec

## Goal

Turn the Saved page into a shoot-planning workspace. Oculi should recommend a morning route and a sunset route from the user's saved places, then hand navigation off to Google Maps or Apple Maps using addresses or coordinates.

Oculi is not a turn-by-turn navigation app. It should answer: "Where should I shoot, when should I arrive, and what address should I open in Maps?"

## Current Implementation Files

- `app/saved/page.tsx` loads saved places/photos from demo state and renders `SavedPanel`.
- `components/saved-panel.tsx` owns the Saved page UI, filters, saved-place grid, and shoot planner panel.
- `lib/saved-route-planner.ts` owns route recommendation logic, address lookup, per-stop map URLs, and full-route Google/Apple links.
- `components/mapbox-map.tsx` renders the map preview. If Mapbox is not configured, it falls back to the stylized map when `requireMapbox` is false.

## User Experience

The Saved page has two major zones:

1. Saved places grid
   - Search saved places.
   - Filter by best light.
   - Filter by scene type.
   - Open a place detail page.
   - Remove a saved place with the bookmark action.

2. Plan a shoot day panel
   - Shows a compact map overview of recommended stops.
   - Lets the user switch between `Morning route` and `Sunset route`.
   - Shows ordered stops with:
     - place name
     - arrival time
     - time window
     - shoot note
     - address
     - coordinate fallback
     - match score
     - `Copy address`
     - `Google Maps`
     - `Apple Maps`
   - Primary route actions open map apps, not an Oculi navigation route.

## Route Recommendation Rules

Use saved places as the candidate pool. If filters produce matches, build routes from filtered saved places. If filters produce no matches, build routes from the full saved list.

Morning route:

- Prefer best times/tags/photo text containing:
  - `sunrise`
  - `morning`
  - `fog`
  - `foggy`
  - `daylight`
- Use up to 3 stops.
- Arrival labels should start around 6:00 AM to 8:30 AM.
- Notes should emphasize fog breaks, lower crowds, soft early light, and reduced glare.

Sunset route:

- Prefer best times/tags/photo text containing:
  - `sunset`
  - `golden hour`
  - `blue hour`
  - `late afternoon`
  - `night`
- Use up to 2 stops.
- Arrival labels should start around 5:30 PM to 7:30 PM.
- Notes should emphasize tide/wind checks, golden-hour compression, skyline layers, and blue-hour hold time.

Scoring inputs:

- route-specific light keyword match
- recent activity score
- save count
- number of saved photos at the place
- Tim-curated boost
- small penalty for places that require tide or difficult access

## Map URL Behavior

Each stop should have:

- address string
- coordinate string, formatted like `37.80780,-122.47470`
- Google Maps search URL
- Apple Maps place URL

Each route should have:

- Google Maps directions URL with last stop as destination and earlier stops as waypoints.
- Apple Maps directions URL to the first stop, because Apple Maps URL support for multiple web waypoints is limited.

Expected Google route format:

```text
https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=<lat,lng>&waypoints=<lat,lng>|<lat,lng>
```

Expected Apple stop/route formats:

```text
https://maps.apple.com/?ll=<lat>,<lng>&q=<encoded place name>
https://maps.apple.com/?daddr=<lat>,<lng>&dirflg=d
```

## Backend/Data Model Requirements

Demo mode currently uses static data. A production backend should persist these fields:

```ts
type Place = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  fuzzyLocationLabel: string;
  navigationAddress?: string;
  bestTimes: string[];
  tags: string[];
  saveCount: number;
  recentActivityScore: number;
  timCurated: boolean;
  coverPhotoUrl: string;
};
```

Recommended future tables:

- `saved_places`: `user_id`, `place_id`, `created_at`
- `route_plans`: `id`, `user_id`, `kind`, `name`, `created_at`, `updated_at`
- `route_plan_stops`: `route_plan_id`, `place_id`, `position`, `arrival_label`, `custom_note`

Do not persist Google/Apple URLs. Generate them from place coordinates and addresses at request/render time.

## Implementation Requirements

- Keep route planning pure and testable in `lib/saved-route-planner.ts`.
- Do not put scoring logic directly in the React component.
- Do not call Google Maps or Apple Maps APIs for MVP. Use URL handoff only.
- Do not show turn-by-turn directions inside Oculi.
- Do not expose exact hidden/private locations. Only use public-access places.
- Keep the map preview contextual. It should show stop locations, not full route navigation.
- Buttons that leave Oculi must be anchors with `target="_blank"` and `rel="noreferrer"`.
- Copy address should use `navigator.clipboard.writeText`; if clipboard fails, show the address in status text.

## Empty/Error States

- If the user has no saved places, show an empty saved grid and explain that routes appear after saving places.
- If route has no stops, disable map-app route buttons visually and functionally.
- If filters return zero places, keep the planner useful by falling back to the full saved list and show a small message.
- If Mapbox token is absent, use the stylized map preview rather than blocking the planner.

## Future Enhancements

- Let users reorder route stops.
- Let users remove a stop from a generated plan.
- Let users pin a stop so regeneration keeps it.
- Let users save multiple named plans.
- Add travel mode choices: driving, transit, walking.
- Add real distance/time estimates through Mapbox Directions or Google Directions only if needed.
- Add tide/weather/sun-position data for route ranking.
