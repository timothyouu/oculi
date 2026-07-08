-- Saved page shoot planner backend support.
-- Oculi generates Google/Apple Maps URLs in app code; the backend stores only
-- public navigation addresses, route plans, and route stops.

create extension if not exists pgcrypto;

create table if not exists public.route_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null check (kind in ('morning', 'sunset', 'custom')),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.route_plans is
  'User-saved shoot plans generated from saved public photo spots. Map-provider URLs are generated client/server-side and are not persisted.';

create index if not exists route_plans_user_created_idx
  on public.route_plans (user_id, created_at desc);

create table if not exists public.route_plan_stops (
  id uuid primary key default gen_random_uuid(),
  route_plan_id uuid not null references public.route_plans(id) on delete cascade,
  place_id text not null,
  position integer not null check (position >= 0),
  arrival_label text,
  custom_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_plan_id, position),
  unique (route_plan_id, place_id)
);

comment on table public.route_plan_stops is
  'Ordered stops for a saved shoot plan. place_id points at oculi_demo_catalog_items(kind=place,item_id) in the demo catalog.';

create index if not exists route_plan_stops_route_position_idx
  on public.route_plan_stops (route_plan_id, position);

create index if not exists route_plan_stops_place_idx
  on public.route_plan_stops (place_id);

alter table public.route_plans enable row level security;
alter table public.route_plan_stops enable row level security;

drop policy if exists "Allow demo route plan reads" on public.route_plans;
create policy "Allow demo route plan reads"
  on public.route_plans
  for select
  using (true);

drop policy if exists "Allow demo route plan inserts" on public.route_plans;
create policy "Allow demo route plan inserts"
  on public.route_plans
  for insert
  with check (true);

drop policy if exists "Allow demo route plan updates" on public.route_plans;
create policy "Allow demo route plan updates"
  on public.route_plans
  for update
  using (true)
  with check (true);

drop policy if exists "Allow demo route plan deletes" on public.route_plans;
create policy "Allow demo route plan deletes"
  on public.route_plans
  for delete
  using (true);

drop policy if exists "Allow demo route stop reads" on public.route_plan_stops;
create policy "Allow demo route stop reads"
  on public.route_plan_stops
  for select
  using (true);

drop policy if exists "Allow demo route stop inserts" on public.route_plan_stops;
create policy "Allow demo route stop inserts"
  on public.route_plan_stops
  for insert
  with check (true);

drop policy if exists "Allow demo route stop updates" on public.route_plan_stops;
create policy "Allow demo route stop updates"
  on public.route_plan_stops
  for update
  using (true)
  with check (true);

drop policy if exists "Allow demo route stop deletes" on public.route_plan_stops;
create policy "Allow demo route stop deletes"
  on public.route_plan_stops
  for delete
  using (true);

with place_addresses(item_id, navigation_address) as (
  values
    ('golden-gate-overlook', 'Golden Gate Bridge Overlook, Lincoln Blvd, San Francisco, CA'),
    ('baker-beach', 'Baker Beach, Battery Chamberlin Rd, San Francisco, CA'),
    ('palace-fine-arts', 'Palace of Fine Arts, 3601 Lyon St, San Francisco, CA'),
    ('twin-peaks', 'Twin Peaks, 501 Twin Peaks Blvd, San Francisco, CA'),
    ('lands-end', 'Lands End Trail, 680 Point Lobos Ave, San Francisco, CA'),
    ('sutro-baths', 'Sutro Baths, 1004 Point Lobos Ave, San Francisco, CA'),
    ('embarcadero', 'Ferry Building, 1 Ferry Building, San Francisco, CA'),
    ('dolores-park', 'Mission Dolores Park, Dolores St & 19th St, San Francisco, CA'),
    ('painted-ladies', 'Painted Ladies, Steiner St & Hayes St, San Francisco, CA'),
    ('battery-spencer', 'Battery Spencer, Conzelman Rd, Sausalito, CA'),
    ('marshall-beach', 'Marshall''s Beach, Batteries to Bluffs Trail, San Francisco, CA'),
    ('fort-point', 'Fort Point National Historic Site, Long Ave & Marine Dr, San Francisco, CA'),
    ('chrissy-field', 'Chrissy Field East Beach, 1199 E Beach, San Francisco, CA'),
    ('coit-tower', 'Coit Tower, 1 Telegraph Hill Blvd, San Francisco, CA'),
    ('salesforce-park', 'Salesforce Park, 425 Mission St, San Francisco, CA'),
    ('chinatown-grant', 'Grant Avenue, Chinatown, San Francisco, CA'),
    ('ocean-beach', 'Ocean Beach, Great Hwy, San Francisco, CA'),
    ('bernal-heights', 'Bernal Heights Park, 3400-3416 Folsom St, San Francisco, CA'),
    ('grace-cathedral', 'Grace Cathedral, 1100 California St, San Francisco, CA'),
    ('mission-murals', 'Clarion Alley Murals, Clarion Alley, San Francisco, CA')
)
update public.oculi_demo_catalog_items catalog
set payload = jsonb_set(catalog.payload, '{navigationAddress}', to_jsonb(place_addresses.navigation_address), true),
    updated_at = now()
from place_addresses
where catalog.kind = 'place'
  and catalog.item_id = place_addresses.item_id;

create index if not exists oculi_demo_catalog_items_navigation_address_idx
  on public.oculi_demo_catalog_items ((payload->>'navigationAddress'))
  where kind = 'place';
