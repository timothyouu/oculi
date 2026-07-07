import type { Area, Comment, Photo, Place, User } from "./types";

export const currentUserId = "user-tim";

export const users: User[] = [
  {
    id: currentUserId,
    name: "Tim",
    username: "@tim",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    bio: "Building a ranked map of places worth shooting.",
    homeArea: "San Francisco",
    followerCount: 128,
    followingCount: 46
  },
  {
    id: "user-maya",
    name: "Maya Chen",
    username: "@mayashoots",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    bio: "Golden hour, glass reflections, city walks.",
    homeArea: "Hayes Valley",
    followerCount: 4200,
    followingCount: 212,
    isInfluencer: true
  },
  {
    id: "user-eli",
    name: "Eli Brooks",
    username: "@elibrooks",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    bio: "Street frames and fog-chasing routes.",
    homeArea: "Mission District",
    followerCount: 980,
    followingCount: 305
  },
  {
    id: "user-nora",
    name: "Nora Patel",
    username: "@nora.frames",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
    bio: "Landscape, architecture, and quiet corners.",
    homeArea: "Richmond",
    followerCount: 1510,
    followingCount: 188
  },
  {
    id: "user-jules",
    name: "Jules Rivera",
    username: "@julesr",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
    bio: "Portrait scout. Shade, color, clean backdrops.",
    homeArea: "Oakland",
    followerCount: 756,
    followingCount: 332
  }
];

export const areas: Area[] = [
  {
    id: "sf",
    name: "San Francisco",
    region: "California",
    centerLat: 37.7749,
    centerLng: -122.4194,
    description: "Coastline, hills, fog, architecture, and dense public viewpoints.",
    coverPhotoUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1400&q=80"
  }
];

export const places: Place[] = [
  {
    id: "golden-gate-overlook",
    areaId: "sf",
    name: "Golden Gate Bridge Overlook",
    description: "Classic bridge lines, fog layers, and warm cliff light from public overlooks.",
    lat: 37.8078,
    lng: -122.4747,
    fuzzyLocationLabel: "Near the Presidio overlook",
    timCurated: true,
    saveCount: 842,
    recentActivityScore: 95,
    bestTimes: ["Sunrise", "Blue hour", "Foggy mornings"],
    tags: ["bridge", "fog", "landscape", "iconic"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "baker-beach",
    areaId: "sf",
    name: "Baker Beach",
    description: "Wide sand foregrounds, bridge compression, and textured Pacific light.",
    lat: 37.7935,
    lng: -122.4836,
    fuzzyLocationLabel: "North beach overlook",
    timCurated: true,
    saveCount: 771,
    recentActivityScore: 88,
    bestTimes: ["Sunset", "Low tide"],
    tags: ["beach", "bridge", "portraits", "sunset"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "palace-fine-arts",
    areaId: "sf",
    name: "Palace of Fine Arts",
    description: "Columns, reflections, and portrait-friendly shade around a public lagoon.",
    lat: 37.8021,
    lng: -122.4484,
    fuzzyLocationLabel: "Marina lagoon paths",
    timCurated: false,
    saveCount: 690,
    recentActivityScore: 74,
    bestTimes: ["Morning", "Late afternoon"],
    tags: ["architecture", "portraits", "reflections"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "twin-peaks",
    areaId: "sf",
    name: "Twin Peaks",
    description: "Layered city views with skyline depth and fast-changing weather.",
    lat: 37.7544,
    lng: -122.4477,
    fuzzyLocationLabel: "Public hilltop viewpoints",
    timCurated: true,
    saveCount: 641,
    recentActivityScore: 82,
    bestTimes: ["Sunrise", "Night"],
    tags: ["skyline", "night", "wide-angle"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "lands-end",
    areaId: "sf",
    name: "Lands End Trail",
    description: "Cypress silhouettes, coastal trails, and broken-rock foregrounds.",
    lat: 37.7854,
    lng: -122.5055,
    fuzzyLocationLabel: "Public coastal trail",
    timCurated: false,
    saveCount: 604,
    recentActivityScore: 67,
    bestTimes: ["Morning fog", "Sunset"],
    tags: ["trail", "coast", "moody", "landscape"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "sutro-baths",
    areaId: "sf",
    name: "Sutro Baths",
    description: "Ruins, water channels, ocean spray, and dramatic negative space.",
    lat: 37.7802,
    lng: -122.5139,
    fuzzyLocationLabel: "Near public ruins overlook",
    timCurated: false,
    saveCount: 581,
    recentActivityScore: 71,
    bestTimes: ["Sunset", "Overcast days"],
    tags: ["ruins", "coast", "long exposure"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "embarcadero",
    areaId: "sf",
    name: "Embarcadero Waterfront",
    description: "Bay reflections, street movement, piers, and easy blue-hour compositions.",
    lat: 37.7955,
    lng: -122.3937,
    fuzzyLocationLabel: "Ferry Building waterfront",
    timCurated: false,
    saveCount: 489,
    recentActivityScore: 78,
    bestTimes: ["Blue hour", "Rainy evenings"],
    tags: ["waterfront", "street", "reflections"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "dolores-park",
    areaId: "sf",
    name: "Dolores Park",
    description: "City backdrops, saturated lawns, and casual portrait energy.",
    lat: 37.7596,
    lng: -122.4269,
    fuzzyLocationLabel: "Upper park skyline lawn",
    timCurated: false,
    saveCount: 438,
    recentActivityScore: 69,
    bestTimes: ["Late afternoon", "Clear weekends"],
    tags: ["portraits", "skyline", "social"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1550640469-56877f598616?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "painted-ladies",
    areaId: "sf",
    name: "Painted Ladies / Alamo Square",
    description: "Pastel facades, skyline layers, and clean postcard compositions.",
    lat: 37.7764,
    lng: -122.4328,
    fuzzyLocationLabel: "Alamo Square public lawn",
    timCurated: false,
    saveCount: 514,
    recentActivityScore: 56,
    bestTimes: ["Morning", "Clear afternoons"],
    tags: ["architecture", "color", "skyline"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1531956531700-dc0ee0f1f9a5?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "battery-spencer",
    areaId: "sf",
    name: "Battery Spencer",
    description: "High bridge perspective from a popular public-access overlook.",
    lat: 37.8297,
    lng: -122.4835,
    fuzzyLocationLabel: "Near Battery Spencer",
    timCurated: true,
    saveCount: 817,
    recentActivityScore: 90,
    bestTimes: ["Sunrise", "Golden hour"],
    tags: ["bridge", "overlook", "telephoto"],
    coverPhotoUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1400&q=80"
  }
];

export const photos: Photo[] = [
  {
    id: "photo-1",
    placeId: "golden-gate-overlook",
    userId: "user-maya",
    imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1400&q=80",
    caption: "Fog lifted for maybe six minutes. Worth the early alarm.",
    locationLabel: "Golden Gate Bridge Overlook",
    metadataText: "70mm, f/5.6, soft fog",
    shotAtTimeOfDay: "Sunrise",
    tags: ["fog", "bridge", "golden hour"],
    createdAt: "2026-07-06T14:18:00.000Z",
    likeCount: 184
  },
  {
    id: "photo-2",
    placeId: "baker-beach",
    userId: "user-jules",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    caption: "Clean sand foreground and bridge scale for portraits.",
    locationLabel: "Baker Beach",
    metadataText: "35mm, reflector only",
    shotAtTimeOfDay: "Sunset",
    tags: ["portraits", "beach", "sunset"],
    createdAt: "2026-07-06T03:05:00.000Z",
    likeCount: 97
  },
  {
    id: "photo-3",
    placeId: "palace-fine-arts",
    userId: "user-nora",
    imageUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80",
    caption: "Columns make the framing easy. Watch the bright lagoon highlights.",
    locationLabel: "Palace of Fine Arts",
    metadataText: "50mm, shade portraits",
    shotAtTimeOfDay: "Late afternoon",
    tags: ["architecture", "reflections"],
    createdAt: "2026-07-05T23:40:00.000Z",
    likeCount: 131
  },
  {
    id: "photo-4",
    placeId: "twin-peaks",
    userId: "user-eli",
    imageUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80",
    caption: "The city lights came on before the wind got too brutal.",
    locationLabel: "Twin Peaks",
    metadataText: "Tripod, 2s exposure",
    shotAtTimeOfDay: "Blue hour",
    tags: ["skyline", "night", "tripod"],
    createdAt: "2026-07-05T04:20:00.000Z",
    likeCount: 203
  },
  {
    id: "photo-5",
    placeId: "lands-end",
    userId: "user-maya",
    imageUrl: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1400&q=80",
    caption: "Cypress edge, muted water, no crowd in frame.",
    locationLabel: "Lands End Trail",
    metadataText: "24mm, overcast",
    shotAtTimeOfDay: "Morning",
    tags: ["coast", "trail", "moody"],
    createdAt: "2026-07-04T17:55:00.000Z",
    likeCount: 88
  },
  {
    id: "photo-6",
    placeId: "embarcadero",
    userId: "user-eli",
    imageUrl: "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1400&q=80",
    caption: "Rain gave every pier light a second life.",
    locationLabel: "Embarcadero Waterfront",
    metadataText: "35mm, wet pavement",
    shotAtTimeOfDay: "Blue hour",
    tags: ["street", "reflections", "waterfront"],
    createdAt: "2026-07-03T04:50:00.000Z",
    likeCount: 76
  }
];

export const comments: Comment[] = [
  {
    id: "comment-1",
    photoId: "photo-1",
    userId: "user-nora",
    body: "That fog layer is exactly what I hope for there.",
    createdAt: "2026-07-06T16:10:00.000Z",
    likeCount: 12,
    replies: [
      {
        id: "reply-1",
        userId: "user-maya",
        body: "It disappears fast. I got there before 6.",
        createdAt: "2026-07-06T16:25:00.000Z",
        likeCount: 8
      }
    ]
  },
  {
    id: "comment-2",
    photoId: "photo-2",
    userId: "user-eli",
    body: "Good call shooting lower on the beach.",
    createdAt: "2026-07-06T05:14:00.000Z",
    likeCount: 5,
    replies: []
  }
];
