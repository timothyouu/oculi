create table if not exists public.oculi_demo_states (
  user_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

comment on column public.oculi_demo_states.state is
  'Demo state JSON, including viewedPlaceIds, placeViews, lastViewedPlaceId, lastDiscoveryPlaceId, and discoveryActiveIndex for place-view resume tracking.';

create index if not exists oculi_demo_states_last_viewed_place_idx
  on public.oculi_demo_states ((state->>'lastViewedPlaceId'));

create index if not exists oculi_demo_states_viewed_place_ids_idx
  on public.oculi_demo_states
  using gin ((state->'viewedPlaceIds'));

alter table public.oculi_demo_states enable row level security;

drop policy if exists "Allow demo state reads" on public.oculi_demo_states;
create policy "Allow demo state reads"
  on public.oculi_demo_states
  for select
  using (true);

drop policy if exists "Allow demo state writes" on public.oculi_demo_states;
create policy "Allow demo state writes"
  on public.oculi_demo_states
  for insert
  with check (true);

drop policy if exists "Allow demo state updates" on public.oculi_demo_states;
create policy "Allow demo state updates"
  on public.oculi_demo_states
  for update
  using (true)
  with check (true);

drop policy if exists "Allow demo state deletes" on public.oculi_demo_states;
create policy "Allow demo state deletes"
  on public.oculi_demo_states
  for delete
  using (true);

insert into storage.buckets (id, name, public)
values ('oculi-photos', 'oculi-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Allow demo photo uploads" on storage.objects;
create policy "Allow demo photo uploads"
  on storage.objects
  for insert
  with check (bucket_id = 'oculi-photos');

drop policy if exists "Allow demo photo updates" on storage.objects;
create policy "Allow demo photo updates"
  on storage.objects
  for update
  using (bucket_id = 'oculi-photos')
  with check (bucket_id = 'oculi-photos');

drop policy if exists "Allow public demo photo reads" on storage.objects;
create policy "Allow public demo photo reads"
  on storage.objects
  for select
  using (bucket_id = 'oculi-photos');

create table if not exists public.oculi_demo_catalog_items (
  kind text not null check (kind in ('user', 'area', 'place', 'photo')),
  item_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, item_id)
);

comment on table public.oculi_demo_catalog_items is
  'Seeded Oculi demo catalog records for users, places, and photos. The app keeps a local seed copy for fast demos; this table mirrors added catalog data in Supabase.';

create index if not exists oculi_demo_catalog_items_payload_gin_idx
  on public.oculi_demo_catalog_items
  using gin (payload);

alter table public.oculi_demo_catalog_items enable row level security;

drop policy if exists "Allow public demo catalog reads" on public.oculi_demo_catalog_items;
create policy "Allow public demo catalog reads"
  on public.oculi_demo_catalog_items
  for select
  using (true);

drop policy if exists "Allow demo catalog writes" on public.oculi_demo_catalog_items;
create policy "Allow demo catalog writes"
  on public.oculi_demo_catalog_items
  for insert
  with check (true);

drop policy if exists "Allow demo catalog updates" on public.oculi_demo_catalog_items;
create policy "Allow demo catalog updates"
  on public.oculi_demo_catalog_items
  for update
  using (true)
  with check (true);

insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'user', value->>'id', value, now()
from jsonb_array_elements($$[
  {"id":"user-lena","name":"Lena Ortiz","username":"@lena.light","avatarUrl":"/generated/avatar-lena-ortiz.png","bio":"Neighborhood color, stairways, and small light pockets.","homeArea":"Noe Valley","followerCount":1280,"followingCount":244},
  {"id":"user-sam","name":"Sam Wilder","username":"@samwide","avatarUrl":"/generated/avatar-sam-wilder.png","bio":"Wide frames, rooftops, piers, and moving weather.","homeArea":"North Beach","followerCount":2310,"followingCount":412,"isInfluencer":true},
  {"id":"user-isha","name":"Isha Raman","username":"@isha.frames","avatarUrl":"/generated/avatar-isha-raman.png","bio":"Street portraits and architecture details.","homeArea":"Inner Sunset","followerCount":890,"followingCount":176}
]$$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;

insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'place', value->>'id', value, now()
from jsonb_array_elements($$[
  {"id":"marshall-beach","areaId":"sf","name":"Marshall's Beach","description":"Rocky shoreline, bridge scale, and compressed sunset frames below the bluffs.","lat":37.8008,"lng":-122.4832,"fuzzyLocationLabel":"Below the Presidio bluffs","timCurated":true,"saveCount":734,"recentActivityScore":86,"bestTimes":["Sunset","Low tide","Golden hour"],"tags":["beach","bridge","coast","landscape"],"coverPhotoUrl":"/generated/marshall-beach-rocks.png"},
  {"id":"fort-point","areaId":"sf","name":"Fort Point","description":"Brick arches, bridge understructure, wave texture, and dramatic shadow.","lat":37.8107,"lng":-122.4772,"fuzzyLocationLabel":"Under the south bridge approach","timCurated":false,"saveCount":612,"recentActivityScore":83,"bestTimes":["Morning","Blue hour","Foggy mornings"],"tags":["bridge","architecture","street","waterfront"],"coverPhotoUrl":"/generated/fort-point-arches.png"},
  {"id":"chrissy-field","areaId":"sf","name":"Chrissy Field","description":"Open waterfront, runners, dogs, bridge silhouettes, and clean fog layers.","lat":37.8037,"lng":-122.4636,"fuzzyLocationLabel":"Marina waterfront lawns","timCurated":false,"saveCount":566,"recentActivityScore":80,"bestTimes":["Sunrise","Golden hour","Daylight"],"tags":["waterfront","bridge","portraits","landscape"],"coverPhotoUrl":"/generated/chrissy-field-waterfront.png"},
  {"id":"coit-tower","areaId":"sf","name":"Coit Tower / Telegraph Hill","description":"City layers, bay views, stairway details, and North Beach color.","lat":37.8024,"lng":-122.4058,"fuzzyLocationLabel":"Telegraph Hill public paths","timCurated":false,"saveCount":458,"recentActivityScore":73,"bestTimes":["Morning","Clear afternoons","Blue hour"],"tags":["skyline","architecture","street","bay"],"coverPhotoUrl":"/generated/coit-tower-morning.png"},
  {"id":"salesforce-park","areaId":"sf","name":"Salesforce Park","description":"Elevated garden paths, glass reflections, clean portrait shade, and skyline edges.","lat":37.7897,"lng":-122.3963,"fuzzyLocationLabel":"Downtown elevated park","timCurated":false,"saveCount":394,"recentActivityScore":76,"bestTimes":["Daylight","Late afternoon","Blue hour"],"tags":["architecture","portraits","reflections","skyline"],"coverPhotoUrl":"/generated/salesforce-park-reflections.png"},
  {"id":"chinatown-grant","areaId":"sf","name":"Chinatown Grant Avenue","description":"Layered signs, lanterns, compressed storefronts, and strong street color.","lat":37.7941,"lng":-122.4078,"fuzzyLocationLabel":"Grant Avenue corridor","timCurated":false,"saveCount":376,"recentActivityScore":77,"bestTimes":["Daylight","Night","Rainy evenings"],"tags":["street","color","architecture","night"],"coverPhotoUrl":"/generated/chinatown-grant-night.png"},
  {"id":"ocean-beach","areaId":"sf","name":"Ocean Beach","description":"Wide negative space, surfers, dunes, and soft Pacific haze.","lat":37.7594,"lng":-122.5107,"fuzzyLocationLabel":"Outer Sunset shoreline","timCurated":false,"saveCount":421,"recentActivityScore":65,"bestTimes":["Sunset","Overcast days","Morning fog"],"tags":["beach","coast","landscape","surfers"],"coverPhotoUrl":"/generated/ocean-beach-surf.png"},
  {"id":"bernal-heights","areaId":"sf","name":"Bernal Heights Park","description":"Neighborhood hill views, skyline diagonals, dogs, and warm grass texture.","lat":37.743,"lng":-122.4148,"fuzzyLocationLabel":"Bernal hilltop paths","timCurated":false,"saveCount":402,"recentActivityScore":68,"bestTimes":["Sunrise","Sunset","Golden hour"],"tags":["skyline","landscape","portraits","trail"],"coverPhotoUrl":"/generated/bernal-heights-golden-hour.png"},
  {"id":"grace-cathedral","areaId":"sf","name":"Grace Cathedral","description":"Stone facades, doors, stairs, and calm portrait shade around Nob Hill.","lat":37.7919,"lng":-122.4132,"fuzzyLocationLabel":"Nob Hill plaza","timCurated":false,"saveCount":352,"recentActivityScore":61,"bestTimes":["Morning","Late afternoon","Daylight"],"tags":["architecture","portraits","stairs","stone"],"coverPhotoUrl":"/generated/grace-cathedral-stairs.png"},
  {"id":"mission-murals","areaId":"sf","name":"Mission Murals","description":"Colorful alleys, street portraits, painted walls, and layered neighborhood texture.","lat":37.7524,"lng":-122.4125,"fuzzyLocationLabel":"Clarion and Balmy alley area","timCurated":false,"saveCount":465,"recentActivityScore":79,"bestTimes":["Daylight","Late afternoon","Overcast days"],"tags":["street","color","portraits","murals"],"coverPhotoUrl":"/generated/mission-murals-color.png"}
]$$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;

insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'photo', value->>'id', value, now()
from jsonb_array_elements($$[
  {"id":"photo-7","placeId":"golden-gate-overlook","userId":"user-sam","imageUrl":"/generated/golden-gate-overlook-fog-break.png","caption":"Bridge tower vanished, then came back with a clean orange edge.","locationLabel":"Golden Gate Bridge Overlook","metadataText":"135mm, fog break","shotAtTimeOfDay":"Blue hour","tags":["bridge","fog","telephoto"],"createdAt":"2026-07-06T13:52:00.000Z","likeCount":221},
  {"id":"photo-8","placeId":"golden-gate-overlook","userId":"user-nora","imageUrl":"/generated/golden-gate-overlook-headlands.png","caption":"Layered headlands behind the south tower.","locationLabel":"Golden Gate Bridge Overlook","metadataText":"85mm, haze","shotAtTimeOfDay":"Sunrise","tags":["landscape","bridge","haze"],"createdAt":"2026-07-05T14:02:00.000Z","likeCount":168},
  {"id":"photo-9","placeId":"battery-spencer","userId":"user-maya","imageUrl":"/generated/post-photo-9-classic-high-bridge-angle-but-the-fog-line-kept-it-from-feeling-flat.png","caption":"Classic high bridge angle, but the fog line kept it from feeling flat.","locationLabel":"Battery Spencer","metadataText":"70mm, handheld","shotAtTimeOfDay":"Golden hour","tags":["bridge","overlook","fog"],"createdAt":"2026-07-05T03:08:00.000Z","likeCount":196},
  {"id":"photo-10","placeId":"battery-spencer","userId":"user-sam","imageUrl":"/generated/battery-spencer-night.png","caption":"Traffic trails under the tower from the overlook rail.","locationLabel":"Battery Spencer","metadataText":"Tripod, 4s exposure","shotAtTimeOfDay":"Night","tags":["bridge","night","long exposure"],"createdAt":"2026-07-04T05:12:00.000Z","likeCount":151},
  {"id":"photo-11","placeId":"marshall-beach","userId":"user-jules","imageUrl":"/generated/post-photo-11-the-rocks-make-the-foreground-do-half-the-work.png","caption":"The rocks make the foreground do half the work.","locationLabel":"Marshall's Beach","metadataText":"24mm, low tide","shotAtTimeOfDay":"Sunset","tags":["beach","bridge","coast"],"createdAt":"2026-07-04T03:22:00.000Z","likeCount":122},
  {"id":"photo-12","placeId":"marshall-beach","userId":"user-lena","imageUrl":"/generated/marshall-beach-silhouettes.png","caption":"Small silhouettes below the bridge made the scale click.","locationLabel":"Marshall's Beach","metadataText":"50mm, sunset haze","shotAtTimeOfDay":"Golden hour","tags":["landscape","beach","silhouette"],"createdAt":"2026-07-03T03:40:00.000Z","likeCount":109},
  {"id":"photo-13","placeId":"fort-point","userId":"user-isha","imageUrl":"/generated/post-photo-13-brick-arch-shadows-under-the-bridge-are-great-for-portraits.png","caption":"Brick arch shadows under the bridge are great for portraits.","locationLabel":"Fort Point","metadataText":"35mm, shade","shotAtTimeOfDay":"Morning","tags":["architecture","bridge","portraits"],"createdAt":"2026-07-02T18:35:00.000Z","likeCount":86},
  {"id":"photo-14","placeId":"chrissy-field","userId":"user-nora","imageUrl":"/generated/post-photo-14-easy-waterfront-frames-with-enough-room-to-wait-out-the-crowds.png","caption":"Easy waterfront frames with enough room to wait out the crowds.","locationLabel":"Chrissy Field","metadataText":"35mm, soft wind","shotAtTimeOfDay":"Daylight","tags":["waterfront","bridge","portraits"],"createdAt":"2026-07-02T21:05:00.000Z","likeCount":91},
  {"id":"photo-15","placeId":"palace-fine-arts","userId":"user-isha","imageUrl":"/generated/palace-fine-arts-morning.png","caption":"Soft shade by the columns, clean enough for headshots.","locationLabel":"Palace of Fine Arts","metadataText":"85mm, open shade","shotAtTimeOfDay":"Morning","tags":["architecture","portraits","shade"],"createdAt":"2026-07-02T17:15:00.000Z","likeCount":143},
  {"id":"photo-16","placeId":"twin-peaks","userId":"user-sam","imageUrl":"/generated/twin-peaks-daylight.png","caption":"Windy, but the skyline depth is unmatched when the haze is light.","locationLabel":"Twin Peaks","metadataText":"105mm, clear afternoon","shotAtTimeOfDay":"Daylight","tags":["skyline","wide-angle","haze"],"createdAt":"2026-07-02T00:30:00.000Z","likeCount":174},
  {"id":"photo-17","placeId":"dolores-park","userId":"user-lena","imageUrl":"/generated/post-photo-17-portrait-backdrop-without-needing-to-climb-all-the-way-up-twin-peaks.png","caption":"Portrait backdrop without needing to climb all the way up Twin Peaks.","locationLabel":"Dolores Park","metadataText":"50mm, late sun","shotAtTimeOfDay":"Late afternoon","tags":["portraits","skyline","social"],"createdAt":"2026-07-01T23:45:00.000Z","likeCount":74},
  {"id":"photo-18","placeId":"painted-ladies","userId":"user-isha","imageUrl":"/generated/painted-ladies-cloud-cover.png","caption":"Cloud cover kept the pastel facades from clipping.","locationLabel":"Painted Ladies / Alamo Square","metadataText":"35mm, overcast","shotAtTimeOfDay":"Daylight","tags":["architecture","color","skyline"],"createdAt":"2026-07-01T20:20:00.000Z","likeCount":117},
  {"id":"photo-19","placeId":"coit-tower","userId":"user-sam","imageUrl":"/generated/post-photo-19-bay-layers-from-telegraph-hill-before-the-afternoon-glare.png","caption":"Bay layers from Telegraph Hill before the afternoon glare.","locationLabel":"Coit Tower / Telegraph Hill","metadataText":"70mm, clear morning","shotAtTimeOfDay":"Morning","tags":["skyline","bay","architecture"],"createdAt":"2026-07-01T16:18:00.000Z","likeCount":101},
  {"id":"photo-20","placeId":"salesforce-park","userId":"user-maya","imageUrl":"/generated/post-photo-20-glass-reflections-and-garden-shade-in-one-quick-loop.png","caption":"Glass reflections and garden shade in one quick loop.","locationLabel":"Salesforce Park","metadataText":"35mm, reflective glass","shotAtTimeOfDay":"Blue hour","tags":["architecture","reflections","portraits"],"createdAt":"2026-06-30T04:05:00.000Z","likeCount":89},
  {"id":"photo-21","placeId":"chinatown-grant","userId":"user-lena","imageUrl":"/generated/post-photo-21-lanterns-and-storefront-reds-after-the-light-went-cool.png","caption":"Lanterns and storefront reds after the light went cool.","locationLabel":"Chinatown Grant Avenue","metadataText":"35mm, neon spill","shotAtTimeOfDay":"Night","tags":["street","color","night"],"createdAt":"2026-06-30T05:18:00.000Z","likeCount":96},
  {"id":"photo-22","placeId":"ocean-beach","userId":"user-nora","imageUrl":"/generated/post-photo-22-muted-surf-lines-and-tiny-figures-along-the-dunes.png","caption":"Muted surf lines and tiny figures along the dunes.","locationLabel":"Ocean Beach","metadataText":"70mm, overcast","shotAtTimeOfDay":"Overcast days","tags":["beach","coast","landscape"],"createdAt":"2026-06-29T22:40:00.000Z","likeCount":65},
  {"id":"photo-23","placeId":"bernal-heights","userId":"user-eli","imageUrl":"/generated/post-photo-23-a-smaller-hill-with-a-softer-neighborhood-skyline-angle.png","caption":"A smaller hill with a softer neighborhood skyline angle.","locationLabel":"Bernal Heights Park","metadataText":"50mm, golden grass","shotAtTimeOfDay":"Sunset","tags":["skyline","trail","golden hour"],"createdAt":"2026-06-29T03:25:00.000Z","likeCount":83},
  {"id":"photo-24","placeId":"grace-cathedral","userId":"user-isha","imageUrl":"/generated/post-photo-24-stairs-and-stone-texture-made-a-simple-portrait-set.png","caption":"Stairs and stone texture made a simple portrait set.","locationLabel":"Grace Cathedral","metadataText":"50mm, open shade","shotAtTimeOfDay":"Late afternoon","tags":["architecture","portraits","stairs"],"createdAt":"2026-06-28T23:10:00.000Z","likeCount":72},
  {"id":"photo-25","placeId":"mission-murals","userId":"user-jules","imageUrl":"/generated/mission-murals-color.png","caption":"Color blocks are perfect when the sky is too flat.","locationLabel":"Mission Murals","metadataText":"35mm, overcast","shotAtTimeOfDay":"Daylight","tags":["street","color","portraits"],"createdAt":"2026-06-28T19:45:00.000Z","likeCount":111},
  {"id":"photo-26","placeId":"sutro-baths","userId":"user-sam","imageUrl":"/generated/post-photo-26-water-channels-gave-just-enough-leading-line-into-the-ruins.png","caption":"Water channels gave just enough leading line into the ruins.","locationLabel":"Sutro Baths","metadataText":"24mm, overcast","shotAtTimeOfDay":"Overcast days","tags":["ruins","coast","long exposure"],"createdAt":"2026-06-27T21:22:00.000Z","likeCount":94},
  {"id":"photo-27","placeId":"baker-beach","userId":"user-maya","imageUrl":"/generated/baker-beach-sunset-fog.png","caption":"The bridge tucked into the fog right as the sand warmed up.","locationLabel":"Baker Beach","metadataText":"50mm, sunset fog","shotAtTimeOfDay":"Sunset","tags":["beach","bridge","fog"],"createdAt":"2026-06-27T03:50:00.000Z","likeCount":156},
  {"id":"photo-28","placeId":"embarcadero","userId":"user-lena","imageUrl":"/generated/embarcadero-blue-hour.png","caption":"Blue-hour glass and ferry lights lined up for one block.","locationLabel":"Embarcadero Waterfront","metadataText":"35mm, handheld","shotAtTimeOfDay":"Blue hour","tags":["waterfront","street","reflections"],"createdAt":"2026-06-26T04:35:00.000Z","likeCount":104}
]$$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;
