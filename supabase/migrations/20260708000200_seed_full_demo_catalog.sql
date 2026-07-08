-- Mirrors the full local demo catalog from lib/data.ts into Supabase.
insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'user', value->>'id', value, now()
from jsonb_array_elements($oculi_user$[
  {
    "id": "user-guest",
    "name": "John Doe",
    "username": "@john.doe",
    "avatarUrl": "/generated/default-avatar.svg",
    "bio": "Guest photographer collecting public photo spots around the city.",
    "homeArea": "San Francisco",
    "followerCount": 0,
    "followingCount": 2
  },
  {
    "id": "user-maya",
    "name": "Maya Chen",
    "username": "@mayashoots",
    "avatarUrl": "/generated/maya-chen.png",
    "bio": "Golden hour, glass reflections, city walks.",
    "homeArea": "Hayes Valley",
    "followerCount": 4200,
    "followingCount": 212,
    "isInfluencer": true
  },
  {
    "id": "user-eli",
    "name": "Eli Brooks",
    "username": "@elibrooks",
    "avatarUrl": "/generated/eli-brooks.png",
    "bio": "Street frames and fog-chasing routes.",
    "homeArea": "Mission District",
    "followerCount": 980,
    "followingCount": 305
  },
  {
    "id": "user-nora",
    "name": "Nora Patel",
    "username": "@nora.frames",
    "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
    "bio": "Landscape, architecture, and quiet corners.",
    "homeArea": "Richmond",
    "followerCount": 1510,
    "followingCount": 188
  },
  {
    "id": "user-jules",
    "name": "Jules Rivera",
    "username": "@julesr",
    "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
    "bio": "Portrait scout. Shade, color, clean backdrops.",
    "homeArea": "Oakland",
    "followerCount": 756,
    "followingCount": 332
  },
  {
    "id": "user-lena",
    "name": "Lena Ortiz",
    "username": "@lena.light",
    "avatarUrl": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=80",
    "bio": "Neighborhood color, stairways, and small light pockets.",
    "homeArea": "Noe Valley",
    "followerCount": 1280,
    "followingCount": 244
  },
  {
    "id": "user-sam",
    "name": "Sam Wilder",
    "username": "@samwide",
    "avatarUrl": "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=160&q=80",
    "bio": "Wide frames, rooftops, piers, and moving weather.",
    "homeArea": "North Beach",
    "followerCount": 2310,
    "followingCount": 412,
    "isInfluencer": true
  },
  {
    "id": "user-isha",
    "name": "Isha Raman",
    "username": "@isha.frames",
    "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    "bio": "Street portraits and architecture details.",
    "homeArea": "Inner Sunset",
    "followerCount": 890,
    "followingCount": 176
  }
]$oculi_user$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;

insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'area', value->>'id', value, now()
from jsonb_array_elements($oculi_area$[
  {
    "id": "sf",
    "name": "San Francisco",
    "region": "California",
    "centerLat": 37.7749,
    "centerLng": -122.4194,
    "description": "Coastline, hills, fog, architecture, and dense public viewpoints.",
    "coverPhotoUrl": "/generated/golden-gate-overlook.png"
  }
]$oculi_area$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;

insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'place', value->>'id', value, now()
from jsonb_array_elements($oculi_place$[
  {
    "id": "golden-gate-overlook",
    "areaId": "sf",
    "name": "Golden Gate Bridge Overlook",
    "description": "Classic bridge lines, fog layers, and warm cliff light from public overlooks.",
    "lat": 37.8078,
    "lng": -122.4747,
    "fuzzyLocationLabel": "Near the Presidio overlook",
    "timCurated": true,
    "saveCount": 842,
    "recentActivityScore": 95,
    "bestTimes": [
      "Sunrise",
      "Blue hour",
      "Foggy mornings"
    ],
    "tags": [
      "bridge",
      "fog",
      "landscape",
      "iconic"
    ],
    "coverPhotoUrl": "/generated/golden-gate-overlook.png"
  },
  {
    "id": "baker-beach",
    "areaId": "sf",
    "name": "Baker Beach",
    "description": "Wide sand foregrounds, bridge compression, and textured Pacific light.",
    "lat": 37.7935,
    "lng": -122.4836,
    "fuzzyLocationLabel": "North beach overlook",
    "timCurated": true,
    "saveCount": 771,
    "recentActivityScore": 88,
    "bestTimes": [
      "Sunset",
      "Low tide"
    ],
    "tags": [
      "beach",
      "bridge",
      "portraits",
      "sunset"
    ],
    "coverPhotoUrl": "/generated/baker-beach.png"
  },
  {
    "id": "palace-fine-arts",
    "areaId": "sf",
    "name": "Palace of Fine Arts",
    "description": "Columns, reflections, and portrait-friendly shade around a public lagoon.",
    "lat": 37.8021,
    "lng": -122.4484,
    "fuzzyLocationLabel": "Marina lagoon paths",
    "timCurated": false,
    "saveCount": 690,
    "recentActivityScore": 74,
    "bestTimes": [
      "Morning",
      "Late afternoon"
    ],
    "tags": [
      "architecture",
      "portraits",
      "reflections"
    ],
    "coverPhotoUrl": "/generated/palace-fine-arts.png"
  },
  {
    "id": "twin-peaks",
    "areaId": "sf",
    "name": "Twin Peaks",
    "description": "Layered city views with skyline depth and fast-changing weather.",
    "lat": 37.7544,
    "lng": -122.4477,
    "fuzzyLocationLabel": "Public hilltop viewpoints",
    "timCurated": true,
    "saveCount": 641,
    "recentActivityScore": 82,
    "bestTimes": [
      "Sunrise",
      "Night"
    ],
    "tags": [
      "skyline",
      "night",
      "wide-angle"
    ],
    "coverPhotoUrl": "/generated/twin-peaks.png"
  },
  {
    "id": "lands-end",
    "areaId": "sf",
    "name": "Lands End Trail",
    "description": "Cypress silhouettes, coastal trails, and broken-rock foregrounds.",
    "lat": 37.7854,
    "lng": -122.5055,
    "fuzzyLocationLabel": "Public coastal trail",
    "timCurated": false,
    "saveCount": 604,
    "recentActivityScore": 67,
    "bestTimes": [
      "Morning fog",
      "Sunset"
    ],
    "tags": [
      "trail",
      "coast",
      "moody",
      "landscape"
    ],
    "coverPhotoUrl": "/generated/lands-end.png"
  },
  {
    "id": "sutro-baths",
    "areaId": "sf",
    "name": "Sutro Baths",
    "description": "Ruins, water channels, ocean spray, and dramatic negative space.",
    "lat": 37.7802,
    "lng": -122.5139,
    "fuzzyLocationLabel": "Near public ruins overlook",
    "timCurated": false,
    "saveCount": 581,
    "recentActivityScore": 71,
    "bestTimes": [
      "Sunset",
      "Overcast days"
    ],
    "tags": [
      "ruins",
      "coast",
      "long exposure"
    ],
    "coverPhotoUrl": "/generated/sutro-baths.png"
  },
  {
    "id": "embarcadero",
    "areaId": "sf",
    "name": "Embarcadero Waterfront",
    "description": "Bay reflections, street movement, piers, and easy blue-hour compositions.",
    "lat": 37.7955,
    "lng": -122.3937,
    "fuzzyLocationLabel": "Ferry Building waterfront",
    "timCurated": false,
    "saveCount": 489,
    "recentActivityScore": 78,
    "bestTimes": [
      "Blue hour",
      "Rainy evenings"
    ],
    "tags": [
      "waterfront",
      "street",
      "reflections"
    ],
    "coverPhotoUrl": "/generated/embarcadero.png"
  },
  {
    "id": "dolores-park",
    "areaId": "sf",
    "name": "Dolores Park",
    "description": "City backdrops, saturated lawns, and casual portrait energy.",
    "lat": 37.7596,
    "lng": -122.4269,
    "fuzzyLocationLabel": "Upper park skyline lawn",
    "timCurated": false,
    "saveCount": 438,
    "recentActivityScore": 69,
    "bestTimes": [
      "Late afternoon",
      "Clear weekends"
    ],
    "tags": [
      "portraits",
      "skyline",
      "social"
    ],
    "coverPhotoUrl": "/generated/dolores-park-late-afternoon.png"
  },
  {
    "id": "painted-ladies",
    "areaId": "sf",
    "name": "Painted Ladies / Alamo Square",
    "description": "Pastel facades, skyline layers, and clean postcard compositions.",
    "lat": 37.7764,
    "lng": -122.4328,
    "fuzzyLocationLabel": "Alamo Square public lawn",
    "timCurated": false,
    "saveCount": 514,
    "recentActivityScore": 56,
    "bestTimes": [
      "Morning",
      "Clear afternoons"
    ],
    "tags": [
      "architecture",
      "color",
      "skyline"
    ],
    "coverPhotoUrl": "/generated/painted-ladies.png"
  },
  {
    "id": "battery-spencer",
    "areaId": "sf",
    "name": "Battery Spencer",
    "description": "High bridge perspective from a popular public-access overlook.",
    "lat": 37.8297,
    "lng": -122.4835,
    "fuzzyLocationLabel": "Near Battery Spencer",
    "timCurated": true,
    "saveCount": 817,
    "recentActivityScore": 90,
    "bestTimes": [
      "Sunrise",
      "Golden hour"
    ],
    "tags": [
      "bridge",
      "overlook",
      "telephoto"
    ],
    "coverPhotoUrl": "/generated/battery-spencer-golden-hour.png"
  },
  {
    "id": "marshall-beach",
    "areaId": "sf",
    "name": "Marshall's Beach",
    "description": "Rocky shoreline, bridge scale, and compressed sunset frames below the bluffs.",
    "lat": 37.8008,
    "lng": -122.4832,
    "fuzzyLocationLabel": "Below the Presidio bluffs",
    "timCurated": true,
    "saveCount": 734,
    "recentActivityScore": 86,
    "bestTimes": [
      "Sunset",
      "Low tide",
      "Golden hour"
    ],
    "tags": [
      "beach",
      "bridge",
      "coast",
      "landscape"
    ],
    "coverPhotoUrl": "/generated/marshall-beach-rocks.png"
  },
  {
    "id": "fort-point",
    "areaId": "sf",
    "name": "Fort Point",
    "description": "Brick arches, bridge understructure, wave texture, and dramatic shadow.",
    "lat": 37.8107,
    "lng": -122.4772,
    "fuzzyLocationLabel": "Under the south bridge approach",
    "timCurated": false,
    "saveCount": 612,
    "recentActivityScore": 83,
    "bestTimes": [
      "Morning",
      "Blue hour",
      "Foggy mornings"
    ],
    "tags": [
      "bridge",
      "architecture",
      "street",
      "waterfront"
    ],
    "coverPhotoUrl": "/generated/fort-point-arches.png"
  },
  {
    "id": "chrissy-field",
    "areaId": "sf",
    "name": "Chrissy Field",
    "description": "Open waterfront, runners, dogs, bridge silhouettes, and clean fog layers.",
    "lat": 37.8037,
    "lng": -122.4636,
    "fuzzyLocationLabel": "Marina waterfront lawns",
    "timCurated": false,
    "saveCount": 566,
    "recentActivityScore": 80,
    "bestTimes": [
      "Sunrise",
      "Golden hour",
      "Daylight"
    ],
    "tags": [
      "waterfront",
      "bridge",
      "portraits",
      "landscape"
    ],
    "coverPhotoUrl": "/generated/chrissy-field-waterfront.png"
  },
  {
    "id": "coit-tower",
    "areaId": "sf",
    "name": "Coit Tower / Telegraph Hill",
    "description": "City layers, bay views, stairway details, and North Beach color.",
    "lat": 37.8024,
    "lng": -122.4058,
    "fuzzyLocationLabel": "Telegraph Hill public paths",
    "timCurated": false,
    "saveCount": 458,
    "recentActivityScore": 73,
    "bestTimes": [
      "Morning",
      "Clear afternoons",
      "Blue hour"
    ],
    "tags": [
      "skyline",
      "architecture",
      "street",
      "bay"
    ],
    "coverPhotoUrl": "/generated/coit-tower-morning.png"
  },
  {
    "id": "salesforce-park",
    "areaId": "sf",
    "name": "Salesforce Park",
    "description": "Elevated garden paths, glass reflections, clean portrait shade, and skyline edges.",
    "lat": 37.7897,
    "lng": -122.3963,
    "fuzzyLocationLabel": "Downtown elevated park",
    "timCurated": false,
    "saveCount": 394,
    "recentActivityScore": 76,
    "bestTimes": [
      "Daylight",
      "Late afternoon",
      "Blue hour"
    ],
    "tags": [
      "architecture",
      "portraits",
      "reflections",
      "skyline"
    ],
    "coverPhotoUrl": "/generated/salesforce-park-reflections.png"
  },
  {
    "id": "chinatown-grant",
    "areaId": "sf",
    "name": "Chinatown Grant Avenue",
    "description": "Layered signs, lanterns, compressed storefronts, and strong street color.",
    "lat": 37.7941,
    "lng": -122.4078,
    "fuzzyLocationLabel": "Grant Avenue corridor",
    "timCurated": false,
    "saveCount": 376,
    "recentActivityScore": 77,
    "bestTimes": [
      "Daylight",
      "Night",
      "Rainy evenings"
    ],
    "tags": [
      "street",
      "color",
      "architecture",
      "night"
    ],
    "coverPhotoUrl": "/generated/chinatown-grant-night.png"
  },
  {
    "id": "ocean-beach",
    "areaId": "sf",
    "name": "Ocean Beach",
    "description": "Wide negative space, surfers, dunes, and soft Pacific haze.",
    "lat": 37.7594,
    "lng": -122.5107,
    "fuzzyLocationLabel": "Outer Sunset shoreline",
    "timCurated": false,
    "saveCount": 421,
    "recentActivityScore": 65,
    "bestTimes": [
      "Sunset",
      "Overcast days",
      "Morning fog"
    ],
    "tags": [
      "beach",
      "coast",
      "landscape",
      "surfers"
    ],
    "coverPhotoUrl": "/generated/ocean-beach-surf.png"
  },
  {
    "id": "bernal-heights",
    "areaId": "sf",
    "name": "Bernal Heights Park",
    "description": "Neighborhood hill views, skyline diagonals, dogs, and warm grass texture.",
    "lat": 37.743,
    "lng": -122.4148,
    "fuzzyLocationLabel": "Bernal hilltop paths",
    "timCurated": false,
    "saveCount": 402,
    "recentActivityScore": 68,
    "bestTimes": [
      "Sunrise",
      "Sunset",
      "Golden hour"
    ],
    "tags": [
      "skyline",
      "landscape",
      "portraits",
      "trail"
    ],
    "coverPhotoUrl": "/generated/bernal-heights-golden-hour.png"
  },
  {
    "id": "grace-cathedral",
    "areaId": "sf",
    "name": "Grace Cathedral",
    "description": "Stone facades, doors, stairs, and calm portrait shade around Nob Hill.",
    "lat": 37.7919,
    "lng": -122.4132,
    "fuzzyLocationLabel": "Nob Hill plaza",
    "timCurated": false,
    "saveCount": 352,
    "recentActivityScore": 61,
    "bestTimes": [
      "Morning",
      "Late afternoon",
      "Daylight"
    ],
    "tags": [
      "architecture",
      "portraits",
      "stairs",
      "stone"
    ],
    "coverPhotoUrl": "/generated/grace-cathedral-stairs.png"
  },
  {
    "id": "mission-murals",
    "areaId": "sf",
    "name": "Mission Murals",
    "description": "Colorful alleys, street portraits, painted walls, and layered neighborhood texture.",
    "lat": 37.7524,
    "lng": -122.4125,
    "fuzzyLocationLabel": "Clarion and Balmy alley area",
    "timCurated": false,
    "saveCount": 465,
    "recentActivityScore": 79,
    "bestTimes": [
      "Daylight",
      "Late afternoon",
      "Overcast days"
    ],
    "tags": [
      "street",
      "color",
      "portraits",
      "murals"
    ],
    "coverPhotoUrl": "/generated/mission-murals-color.png"
  }
]$oculi_place$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;

insert into public.oculi_demo_catalog_items (kind, item_id, payload, updated_at)
select 'photo', value->>'id', value, now()
from jsonb_array_elements($oculi_photo$[
  {
    "id": "photo-1",
    "placeId": "golden-gate-overlook",
    "userId": "user-maya",
    "imageUrl": "/generated/golden-gate-overlook.png",
    "caption": "Fog lifted for maybe six minutes. Worth the early alarm.",
    "locationLabel": "Golden Gate Bridge Overlook",
    "metadataText": "70mm, f/5.6, soft fog",
    "shotAtTimeOfDay": "Sunrise",
    "tags": [
      "fog",
      "bridge",
      "golden hour"
    ],
    "createdAt": "2026-07-06T14:18:00.000Z",
    "likeCount": 184
  },
  {
    "id": "photo-2",
    "placeId": "baker-beach",
    "userId": "user-jules",
    "imageUrl": "/generated/baker-beach.png",
    "caption": "Clean sand foreground and bridge scale for portraits.",
    "locationLabel": "Baker Beach",
    "metadataText": "35mm, reflector only",
    "shotAtTimeOfDay": "Sunset",
    "tags": [
      "portraits",
      "beach",
      "sunset"
    ],
    "createdAt": "2026-07-06T03:05:00.000Z",
    "likeCount": 97
  },
  {
    "id": "photo-3",
    "placeId": "palace-fine-arts",
    "userId": "user-nora",
    "imageUrl": "/generated/palace-fine-arts.png",
    "caption": "Columns make the framing easy. Watch the bright lagoon highlights.",
    "locationLabel": "Palace of Fine Arts",
    "metadataText": "50mm, shade portraits",
    "shotAtTimeOfDay": "Late afternoon",
    "tags": [
      "architecture",
      "reflections"
    ],
    "createdAt": "2026-07-05T23:40:00.000Z",
    "likeCount": 131
  },
  {
    "id": "photo-4",
    "placeId": "twin-peaks",
    "userId": "user-eli",
    "imageUrl": "/generated/twin-peaks.png",
    "caption": "The city lights came on before the wind got too brutal.",
    "locationLabel": "Twin Peaks",
    "metadataText": "Tripod, 2s exposure",
    "shotAtTimeOfDay": "Blue hour",
    "tags": [
      "skyline",
      "night",
      "tripod"
    ],
    "createdAt": "2026-07-05T04:20:00.000Z",
    "likeCount": 203
  },
  {
    "id": "photo-5",
    "placeId": "lands-end",
    "userId": "user-maya",
    "imageUrl": "/generated/lands-end.png",
    "caption": "Cypress edge, muted water, no crowd in frame.",
    "locationLabel": "Lands End Trail",
    "metadataText": "24mm, overcast",
    "shotAtTimeOfDay": "Morning",
    "tags": [
      "coast",
      "trail",
      "moody"
    ],
    "createdAt": "2026-07-04T17:55:00.000Z",
    "likeCount": 88
  },
  {
    "id": "photo-6",
    "placeId": "embarcadero",
    "userId": "user-eli",
    "imageUrl": "/generated/embarcadero.png",
    "caption": "Rain gave every pier light a second life.",
    "locationLabel": "Embarcadero Waterfront",
    "metadataText": "35mm, wet pavement",
    "shotAtTimeOfDay": "Blue hour",
    "tags": [
      "street",
      "reflections",
      "waterfront"
    ],
    "createdAt": "2026-07-03T04:50:00.000Z",
    "likeCount": 76
  },
  {
    "id": "photo-7",
    "placeId": "golden-gate-overlook",
    "userId": "user-sam",
    "imageUrl": "/generated/golden-gate-overlook-fog-break.png",
    "caption": "Bridge tower vanished, then came back with a clean orange edge.",
    "locationLabel": "Golden Gate Bridge Overlook",
    "metadataText": "135mm, fog break",
    "shotAtTimeOfDay": "Blue hour",
    "tags": [
      "bridge",
      "fog",
      "telephoto"
    ],
    "createdAt": "2026-07-06T13:52:00.000Z",
    "likeCount": 221
  },
  {
    "id": "photo-8",
    "placeId": "golden-gate-overlook",
    "userId": "user-nora",
    "imageUrl": "/generated/golden-gate-overlook-headlands.png",
    "caption": "Layered headlands behind the south tower.",
    "locationLabel": "Golden Gate Bridge Overlook",
    "metadataText": "85mm, haze",
    "shotAtTimeOfDay": "Sunrise",
    "tags": [
      "landscape",
      "bridge",
      "haze"
    ],
    "createdAt": "2026-07-05T14:02:00.000Z",
    "likeCount": 168
  },
  {
    "id": "photo-9",
    "placeId": "battery-spencer",
    "userId": "user-maya",
    "imageUrl": "/generated/battery-spencer-golden-hour.png",
    "caption": "Classic high bridge angle, but the fog line kept it from feeling flat.",
    "locationLabel": "Battery Spencer",
    "metadataText": "70mm, handheld",
    "shotAtTimeOfDay": "Golden hour",
    "tags": [
      "bridge",
      "overlook",
      "fog"
    ],
    "createdAt": "2026-07-05T03:08:00.000Z",
    "likeCount": 196
  },
  {
    "id": "photo-10",
    "placeId": "battery-spencer",
    "userId": "user-sam",
    "imageUrl": "/generated/battery-spencer-night.png",
    "caption": "Traffic trails under the tower from the overlook rail.",
    "locationLabel": "Battery Spencer",
    "metadataText": "Tripod, 4s exposure",
    "shotAtTimeOfDay": "Night",
    "tags": [
      "bridge",
      "night",
      "long exposure"
    ],
    "createdAt": "2026-07-04T05:12:00.000Z",
    "likeCount": 151
  },
  {
    "id": "photo-11",
    "placeId": "marshall-beach",
    "userId": "user-jules",
    "imageUrl": "/generated/marshall-beach-rocks.png",
    "caption": "The rocks make the foreground do half the work.",
    "locationLabel": "Marshall's Beach",
    "metadataText": "24mm, low tide",
    "shotAtTimeOfDay": "Sunset",
    "tags": [
      "beach",
      "bridge",
      "coast"
    ],
    "createdAt": "2026-07-04T03:22:00.000Z",
    "likeCount": 122
  },
  {
    "id": "photo-12",
    "placeId": "marshall-beach",
    "userId": "user-lena",
    "imageUrl": "/generated/marshall-beach-silhouettes.png",
    "caption": "Small silhouettes below the bridge made the scale click.",
    "locationLabel": "Marshall's Beach",
    "metadataText": "50mm, sunset haze",
    "shotAtTimeOfDay": "Golden hour",
    "tags": [
      "landscape",
      "beach",
      "silhouette"
    ],
    "createdAt": "2026-07-03T03:40:00.000Z",
    "likeCount": 109
  },
  {
    "id": "photo-13",
    "placeId": "fort-point",
    "userId": "user-isha",
    "imageUrl": "/generated/fort-point-arches.png",
    "caption": "Brick arch shadows under the bridge are great for portraits.",
    "locationLabel": "Fort Point",
    "metadataText": "35mm, shade",
    "shotAtTimeOfDay": "Morning",
    "tags": [
      "architecture",
      "bridge",
      "portraits"
    ],
    "createdAt": "2026-07-02T18:35:00.000Z",
    "likeCount": 86
  },
  {
    "id": "photo-14",
    "placeId": "chrissy-field",
    "userId": "user-nora",
    "imageUrl": "/generated/chrissy-field-waterfront.png",
    "caption": "Easy waterfront frames with enough room to wait out the crowds.",
    "locationLabel": "Chrissy Field",
    "metadataText": "35mm, soft wind",
    "shotAtTimeOfDay": "Daylight",
    "tags": [
      "waterfront",
      "bridge",
      "portraits"
    ],
    "createdAt": "2026-07-02T21:05:00.000Z",
    "likeCount": 91
  },
  {
    "id": "photo-15",
    "placeId": "palace-fine-arts",
    "userId": "user-isha",
    "imageUrl": "/generated/palace-fine-arts-morning.png",
    "caption": "Soft shade by the columns, clean enough for headshots.",
    "locationLabel": "Palace of Fine Arts",
    "metadataText": "85mm, open shade",
    "shotAtTimeOfDay": "Morning",
    "tags": [
      "architecture",
      "portraits",
      "shade"
    ],
    "createdAt": "2026-07-02T17:15:00.000Z",
    "likeCount": 143
  },
  {
    "id": "photo-16",
    "placeId": "twin-peaks",
    "userId": "user-sam",
    "imageUrl": "/generated/twin-peaks-daylight.png",
    "caption": "Windy, but the skyline depth is unmatched when the haze is light.",
    "locationLabel": "Twin Peaks",
    "metadataText": "105mm, clear afternoon",
    "shotAtTimeOfDay": "Daylight",
    "tags": [
      "skyline",
      "wide-angle",
      "haze"
    ],
    "createdAt": "2026-07-02T00:30:00.000Z",
    "likeCount": 174
  },
  {
    "id": "photo-17",
    "placeId": "dolores-park",
    "userId": "user-lena",
    "imageUrl": "/generated/dolores-park-late-afternoon.png",
    "caption": "Portrait backdrop without needing to climb all the way up Twin Peaks.",
    "locationLabel": "Dolores Park",
    "metadataText": "50mm, late sun",
    "shotAtTimeOfDay": "Late afternoon",
    "tags": [
      "portraits",
      "skyline",
      "social"
    ],
    "createdAt": "2026-07-01T23:45:00.000Z",
    "likeCount": 74
  },
  {
    "id": "photo-18",
    "placeId": "painted-ladies",
    "userId": "user-isha",
    "imageUrl": "/generated/painted-ladies-cloud-cover.png",
    "caption": "Cloud cover kept the pastel facades from clipping.",
    "locationLabel": "Painted Ladies / Alamo Square",
    "metadataText": "35mm, overcast",
    "shotAtTimeOfDay": "Daylight",
    "tags": [
      "architecture",
      "color",
      "skyline"
    ],
    "createdAt": "2026-07-01T20:20:00.000Z",
    "likeCount": 117
  },
  {
    "id": "photo-19",
    "placeId": "coit-tower",
    "userId": "user-sam",
    "imageUrl": "/generated/coit-tower-morning.png",
    "caption": "Bay layers from Telegraph Hill before the afternoon glare.",
    "locationLabel": "Coit Tower / Telegraph Hill",
    "metadataText": "70mm, clear morning",
    "shotAtTimeOfDay": "Morning",
    "tags": [
      "skyline",
      "bay",
      "architecture"
    ],
    "createdAt": "2026-07-01T16:18:00.000Z",
    "likeCount": 101
  },
  {
    "id": "photo-20",
    "placeId": "salesforce-park",
    "userId": "user-maya",
    "imageUrl": "/generated/salesforce-park-reflections.png",
    "caption": "Glass reflections and garden shade in one quick loop.",
    "locationLabel": "Salesforce Park",
    "metadataText": "35mm, reflective glass",
    "shotAtTimeOfDay": "Blue hour",
    "tags": [
      "architecture",
      "reflections",
      "portraits"
    ],
    "createdAt": "2026-06-30T04:05:00.000Z",
    "likeCount": 89
  },
  {
    "id": "photo-21",
    "placeId": "chinatown-grant",
    "userId": "user-lena",
    "imageUrl": "/generated/chinatown-grant-night.png",
    "caption": "Lanterns and storefront reds after the light went cool.",
    "locationLabel": "Chinatown Grant Avenue",
    "metadataText": "35mm, neon spill",
    "shotAtTimeOfDay": "Night",
    "tags": [
      "street",
      "color",
      "night"
    ],
    "createdAt": "2026-06-30T05:18:00.000Z",
    "likeCount": 96
  },
  {
    "id": "photo-22",
    "placeId": "ocean-beach",
    "userId": "user-nora",
    "imageUrl": "/generated/ocean-beach-surf.png",
    "caption": "Muted surf lines and tiny figures along the dunes.",
    "locationLabel": "Ocean Beach",
    "metadataText": "70mm, overcast",
    "shotAtTimeOfDay": "Overcast days",
    "tags": [
      "beach",
      "coast",
      "landscape"
    ],
    "createdAt": "2026-06-29T22:40:00.000Z",
    "likeCount": 65
  },
  {
    "id": "photo-23",
    "placeId": "bernal-heights",
    "userId": "user-eli",
    "imageUrl": "/generated/bernal-heights-golden-hour.png",
    "caption": "A smaller hill with a softer neighborhood skyline angle.",
    "locationLabel": "Bernal Heights Park",
    "metadataText": "50mm, golden grass",
    "shotAtTimeOfDay": "Sunset",
    "tags": [
      "skyline",
      "trail",
      "golden hour"
    ],
    "createdAt": "2026-06-29T03:25:00.000Z",
    "likeCount": 83
  },
  {
    "id": "photo-24",
    "placeId": "grace-cathedral",
    "userId": "user-isha",
    "imageUrl": "/generated/grace-cathedral-stairs.png",
    "caption": "Stairs and stone texture made a simple portrait set.",
    "locationLabel": "Grace Cathedral",
    "metadataText": "50mm, open shade",
    "shotAtTimeOfDay": "Late afternoon",
    "tags": [
      "architecture",
      "portraits",
      "stairs"
    ],
    "createdAt": "2026-06-28T23:10:00.000Z",
    "likeCount": 72
  },
  {
    "id": "photo-25",
    "placeId": "mission-murals",
    "userId": "user-jules",
    "imageUrl": "/generated/mission-murals-color.png",
    "caption": "Color blocks are perfect when the sky is too flat.",
    "locationLabel": "Mission Murals",
    "metadataText": "35mm, overcast",
    "shotAtTimeOfDay": "Daylight",
    "tags": [
      "street",
      "color",
      "portraits"
    ],
    "createdAt": "2026-06-28T19:45:00.000Z",
    "likeCount": 111
  },
  {
    "id": "photo-26",
    "placeId": "sutro-baths",
    "userId": "user-sam",
    "imageUrl": "/generated/sutro-baths.png",
    "caption": "Water channels gave just enough leading line into the ruins.",
    "locationLabel": "Sutro Baths",
    "metadataText": "24mm, overcast",
    "shotAtTimeOfDay": "Overcast days",
    "tags": [
      "ruins",
      "coast",
      "long exposure"
    ],
    "createdAt": "2026-06-27T21:22:00.000Z",
    "likeCount": 94
  },
  {
    "id": "photo-27",
    "placeId": "baker-beach",
    "userId": "user-maya",
    "imageUrl": "/generated/baker-beach-sunset-fog.png",
    "caption": "The bridge tucked into the fog right as the sand warmed up.",
    "locationLabel": "Baker Beach",
    "metadataText": "50mm, sunset fog",
    "shotAtTimeOfDay": "Sunset",
    "tags": [
      "beach",
      "bridge",
      "fog"
    ],
    "createdAt": "2026-06-27T03:50:00.000Z",
    "likeCount": 156
  },
  {
    "id": "photo-28",
    "placeId": "embarcadero",
    "userId": "user-lena",
    "imageUrl": "/generated/embarcadero-blue-hour.png",
    "caption": "Blue-hour glass and ferry lights lined up for one block.",
    "locationLabel": "Embarcadero Waterfront",
    "metadataText": "35mm, handheld",
    "shotAtTimeOfDay": "Blue hour",
    "tags": [
      "waterfront",
      "street",
      "reflections"
    ],
    "createdAt": "2026-06-26T04:35:00.000Z",
    "likeCount": 104
  }
]$oculi_photo$::jsonb) as value
on conflict (kind, item_id) do update
set payload = excluded.payload,
    updated_at = excluded.updated_at;
