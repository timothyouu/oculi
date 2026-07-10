import {
  parseAreaPayload,
  parsePhotoPayload,
  parsePlacePayload,
  parseUserPayload,
} from "./catalog-validation";
import { areas, currentUserId, photos, places, users } from "./data";
import { createInitialDemoState, normalizeDemoState } from "./storage";
import { getSupabaseBrowserClient } from "./supabase";
import type { Area, DemoState, Photo, Place, User } from "./types";

const STATE_TABLE = "oculi_demo_states";
const CATALOG_TABLE = "oculi_demo_catalog_items";
const PHOTOS_TABLE = "photos";
const PHOTO_BUCKET = "oculi-photos";

type StateRow = {
  user_id: string;
  state: DemoState;
  updated_at?: string;
};

export type DemoCatalog = {
  users: User[];
  areas: Area[];
  places: Place[];
  photos: Photo[];
};

type CatalogKind = keyof DemoCatalog;

type CatalogRow = {
  kind: "user" | "area" | "place" | "photo";
  item_id: string;
  payload: unknown;
};

type PhotoRow = {
  id: unknown;
  owner_id: unknown;
  place_id: unknown;
  caption: unknown;
  image_url: unknown;
  tags: unknown;
  shot_at_time_of_day: unknown;
  location_label: unknown;
  like_count: unknown;
  created_at: unknown;
  moderation_status: unknown;
};

const parsersByCatalogKind: Record<CatalogKind, (payload: unknown) => unknown> = {
  users: parseUserPayload,
  areas: parseAreaPayload,
  places: parsePlacePayload,
  photos: parsePhotoPayload,
};

/**
 * Maps a `public.photos` row (real, owner-scoped user uploads) to the app's
 * `Photo` shape, then runs it through the same defensive parser used for
 * catalog rows. `owner_id` is a real Supabase auth uid (or null for the one
 * legacy pre-auth row, see 20260710000500_migrate_uploads_to_photos_table.sql)
 * rather than a fictional demo user id, so it won't match any `User.id` in
 * the seed catalog -- that's expected; UI photographer lookups already
 * degrade gracefully (no match = no photographer info rendered) rather than
 * crashing, same as any other unmatched id.
 */
function photoRowToPhoto(row: PhotoRow): Photo | null {
  const candidate = {
    id: row.id,
    placeId: row.place_id,
    userId: typeof row.owner_id === "string" ? row.owner_id : "",
    imageUrl: row.image_url,
    caption: row.caption ?? "",
    locationLabel: row.location_label ?? "",
    metadataText: undefined,
    shotAtTimeOfDay: row.shot_at_time_of_day ?? undefined,
    tags: row.tags,
    createdAt: row.created_at,
    likeCount: row.like_count,
  };
  return parsePhotoPayload(candidate);
}

export const seedCatalog: DemoCatalog = {
  users,
  areas,
  places,
  photos,
};

function mergeById<T extends { id: string }>(seedItems: T[], remoteItems: T[]) {
  const merged = new Map(seedItems.map((item) => [item.id, item]));
  remoteItems.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
}

function isCatalogKind(kind: string): kind is CatalogKind {
  return kind === "users" || kind === "areas" || kind === "places" || kind === "photos";
}

function tableKindToCatalogKind(kind: CatalogRow["kind"]): CatalogKind {
  if (kind === "user") return "users";
  if (kind === "area") return "areas";
  if (kind === "place") return "places";
  return "photos";
}

export function isRemoteStateEnabled() {
  return Boolean(getSupabaseBrowserClient());
}

function durableStateForRemote(state: DemoState): DemoState {
  return {
    ...state,
    uploadedPhotos: state.uploadedPhotos.filter(
      (photo) => !photo.imageUrl.startsWith("blob:") && !photo.imageUrl.startsWith("data:"),
    ),
  };
}

export async function loadRemoteDemoState(stateOwnerId = currentUserId): Promise<DemoState> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return createInitialDemoState();

  const { data, error } = await supabase
    .from(STATE_TABLE)
    .select("state")
    .eq("user_id", stateOwnerId)
    .maybeSingle<StateRow>();

  if (error) {
    console.warn("Unable to load Oculi state from Supabase.", error.message);
    return createInitialDemoState();
  }

  return normalizeDemoState(data?.state);
}

export async function loadRemoteDemoCatalog(): Promise<DemoCatalog> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return seedCatalog;

  const [catalogResult, photosResult] = await Promise.all([
    supabase
      .from(CATALOG_TABLE)
      .select("kind,item_id,payload")
      .order("item_id", { ascending: true })
      .returns<CatalogRow[]>(),
    supabase
      .from(PHOTOS_TABLE)
      .select("id,owner_id,place_id,caption,image_url,tags,shot_at_time_of_day,location_label,like_count,created_at,moderation_status")
      .returns<PhotoRow[]>(),
  ]);

  if (catalogResult.error) {
    console.warn("Unable to load Oculi catalog from Supabase.", catalogResult.error.message);
    return seedCatalog;
  }

  const remoteCatalog: DemoCatalog = {
    users: [],
    areas: [],
    places: [],
    photos: [],
  };

  // Defensive hydration (docs/demo-to-product-audit.md item 3): a single
  // malformed row (e.g. a hand-inserted test row missing required fields)
  // must never propagate into app state and crash a downstream `.some()`/
  // `.map()` call the way it did before. Each row is parsed through the
  // matching validator in lib/catalog-validation.ts; anything that fails is
  // skipped with a console.warn instead of pushed into the merged catalog.
  catalogResult.data?.forEach((row) => {
    const catalogKind = tableKindToCatalogKind(row.kind);
    if (!isCatalogKind(catalogKind)) return;
    const parsed = parsersByCatalogKind[catalogKind](row.payload);
    if (!parsed) {
      console.warn(
        `Skipping malformed Oculi catalog row (kind=${row.kind}, item_id=${row.item_id}).`,
      );
      return;
    }
    remoteCatalog[catalogKind].push(parsed as never);
  });

  if (photosResult.error) {
    console.warn("Unable to load Oculi photos from Supabase.", photosResult.error.message);
  } else {
    photosResult.data?.forEach((row) => {
      const parsed = photoRowToPhoto(row);
      if (!parsed) {
        console.warn(`Skipping malformed Oculi photo row (id=${String(row.id)}).`);
        return;
      }
      remoteCatalog.photos.push(parsed);
    });
  }

  return {
    users: mergeById(seedCatalog.users, remoteCatalog.users),
    areas: mergeById(seedCatalog.areas, remoteCatalog.areas),
    places: mergeById(seedCatalog.places, remoteCatalog.places),
    photos: mergeById(seedCatalog.photos, remoteCatalog.photos).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}

export async function saveRemoteDemoState(state: DemoState, stateOwnerId = currentUserId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(STATE_TABLE).upsert({
    user_id: stateOwnerId,
    state: durableStateForRemote(state),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("Unable to save Oculi state to Supabase.", error.message);
    // Re-throw so callers (lib/persistence-status.ts's retry scheduler) can
    // surface the failure to the user instead of it being silently swallowed.
    throw error;
  }
}

/**
 * Persists a user upload to the real `photos` table (docs/demo-to-product-audit.md
 * item 3) -- kept as the same function/seam callers already use
 * (lib/demo-state.tsx `addPhoto`) so nothing upstream had to restructure.
 * `owner_id` is intentionally omitted from the payload so the column's
 * `default auth.uid()` fills it from the caller's own session; the INSERT
 * RLS policy on `public.photos` requires `owner_id = auth.uid()` and
 * `id like 'upload-%'` (see 20260710000400_create_photos_table.sql), which
 * every id from `lib/demo-state.tsx`'s `makeId("upload")` already satisfies.
 */
export async function saveRemoteCatalogPhoto(photo: Photo) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(PHOTOS_TABLE).upsert({
    id: photo.id,
    place_id: photo.placeId,
    caption: photo.caption,
    image_url: photo.imageUrl,
    tags: photo.tags,
    shot_at_time_of_day: photo.shotAtTimeOfDay ?? null,
    location_label: photo.locationLabel,
    like_count: photo.likeCount,
    created_at: photo.createdAt,
  });

  if (error) console.warn("Unable to save Oculi photo to Supabase.", error.message);
}

export async function resetRemoteDemoState(stateOwnerId = currentUserId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(STATE_TABLE).delete().eq("user_id", stateOwnerId);
  if (error) console.warn("Unable to reset Oculi state in Supabase.", error.message);
}

export async function uploadPhotoFile(file: File, photoId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${currentUserId}/${photoId}.${extension}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || undefined,
    upsert: true,
  });

  if (error) {
    console.warn("Unable to upload Oculi photo to Supabase Storage.", error.message);
    return null;
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
