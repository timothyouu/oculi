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
const SAVED_PLACES_TABLE = "saved_places";
const LIKED_PHOTOS_TABLE = "liked_photos";
const FOLLOWED_USERS_TABLE = "followed_users";
const VIEWED_PHOTOS_TABLE = "viewed_photos";
const PLACE_SAVE_COUNTS_FN = "place_save_counts";

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

// The four relation arrays (saves/follows/likes/photo-views) are no longer
// the source of truth in the uploaded state blob (docs/demo-to-product-audit.md
// item 6) -- they live in their own per-entity tables (see
// 20260710000600_normalize_user_relations.sql) so a toggle is a single row
// insert/delete instead of a whole-state upsert, and so two tabs/devices
// saving different things can't clobber each other's unrelated changes.
// `durableStateForRemote` strips them (plus in-memory-only blob: uploads)
// before every write to `oculi_demo_states`; old rows may still carry stale
// copies of these fields from before this migration, which
// `lib/demo-state.tsx`'s bootstrap reconciles into the new tables once and
// then ignores going forward.
function durableStateForRemote(state: DemoState): DemoState {
  const {
    savedPlaceIds: _savedPlaceIds,
    followedUserIds: _followedUserIds,
    likedPhotoIds: _likedPhotoIds,
    viewedPhotoIds: _viewedPhotoIds,
    ...scalarState
  } = state;

  return {
    ...scalarState,
    savedPlaceIds: [],
    followedUserIds: [],
    likedPhotoIds: [],
    viewedPhotoIds: [],
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

// --- Per-entity relation tables (docs/demo-to-product-audit.md item 6) ---

export type UserRelations = {
  savedPlaceIds: string[];
  followedUserIds: string[];
  likedPhotoIds: string[];
  viewedPhotoIds: string[];
};

function emptyUserRelations(): UserRelations {
  return { savedPlaceIds: [], followedUserIds: [], likedPhotoIds: [], viewedPhotoIds: [] };
}

function asStringColumn(rows: unknown, column: string): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>)[column] : undefined))
    .filter((value): value is string => typeof value === "string");
}

type RelationQueryResult = { data: unknown; error: { message: string } | null };

/** Runs a relation-table query and never rejects -- a network-level failure
 * (e.g. offline, or a misconfigured Supabase URL) becomes a warned, empty
 * result instead of an unhandled rejection that would otherwise sink the
 * whole `Promise.all` this is called from and silently hang bootstrap. */
async function queryRelationRows(query: PromiseLike<RelationQueryResult>, label: string): Promise<unknown> {
  try {
    const { data, error } = await query;
    if (error) {
      console.warn(`Unable to load ${label} from Supabase.`, error.message);
      return [];
    }
    return data;
  } catch (error) {
    console.warn(`Unable to load ${label} from Supabase.`, error);
    return [];
  }
}

/** Loads a user's saved places / follows / likes / photo-view receipts from
 * their dedicated tables -- the durable source of truth going forward. */
export async function loadRemoteUserRelations(ownerId: string): Promise<UserRelations> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return emptyUserRelations();

  const [savedRows, followedRows, likedRows, viewedRows] = await Promise.all([
    queryRelationRows(supabase.from(SAVED_PLACES_TABLE).select("place_id").eq("user_id", ownerId), "saved places"),
    queryRelationRows(
      supabase.from(FOLLOWED_USERS_TABLE).select("followed_user_id").eq("user_id", ownerId),
      "followed users",
    ),
    queryRelationRows(supabase.from(LIKED_PHOTOS_TABLE).select("photo_id").eq("user_id", ownerId), "liked photos"),
    queryRelationRows(supabase.from(VIEWED_PHOTOS_TABLE).select("photo_id").eq("user_id", ownerId), "viewed photos"),
  ]);

  return {
    savedPlaceIds: asStringColumn(savedRows, "place_id"),
    followedUserIds: asStringColumn(followedRows, "followed_user_id"),
    likedPhotoIds: asStringColumn(likedRows, "photo_id"),
    viewedPhotoIds: asStringColumn(viewedRows, "photo_id"),
  };
}

function asLegacyStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * One-time migration helper: reads whatever relation arrays are still
 * embedded in a (possibly pre-migration) `oculi_demo_states.state` JSON blob
 * for `stateOwnerId`, defensively, without assuming the `DemoState` type
 * still declares those fields. Used only by `lib/demo-state.tsx`'s bootstrap
 * reconciliation so saves/follows/likes/views recorded before this table
 * split aren't silently dropped.
 */
export async function loadLegacyRelationsFromStateRow(stateOwnerId: string): Promise<UserRelations> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return emptyUserRelations();

  try {
    const { data, error } = await supabase
      .from(STATE_TABLE)
      .select("state")
      .eq("user_id", stateOwnerId)
      .maybeSingle<{ state: Record<string, unknown> | null }>();

    if (error || !data?.state) return emptyUserRelations();

    return {
      savedPlaceIds: asLegacyStringArray(data.state.savedPlaceIds),
      followedUserIds: asLegacyStringArray(data.state.followedUserIds),
      likedPhotoIds: asLegacyStringArray(data.state.likedPhotoIds),
      viewedPhotoIds: asLegacyStringArray(data.state.viewedPhotoIds),
    };
  } catch (error) {
    console.warn("Unable to load legacy Oculi relations from Supabase.", error);
    return emptyUserRelations();
  }
}

/** Adds or removes a single (user, place) row -- one row op per toggle,
 * never a whole-state upsert. */
export async function setSavedPlaceRemote(ownerId: string, placeId: string, saved: boolean) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = saved
    ? await supabase.from(SAVED_PLACES_TABLE).upsert({ user_id: ownerId, place_id: placeId })
    : await supabase.from(SAVED_PLACES_TABLE).delete().eq("user_id", ownerId).eq("place_id", placeId);

  if (error) console.warn("Unable to save the place toggle to Supabase.", error.message);
}

/** Adds or removes a single (user, followed user) row. */
export async function setFollowedUserRemote(ownerId: string, followedUserId: string, followed: boolean) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = followed
    ? await supabase.from(FOLLOWED_USERS_TABLE).upsert({ user_id: ownerId, followed_user_id: followedUserId })
    : await supabase.from(FOLLOWED_USERS_TABLE).delete().eq("user_id", ownerId).eq("followed_user_id", followedUserId);

  if (error) console.warn("Unable to save the follow toggle to Supabase.", error.message);
}

/** Adds or removes a single (user, photo) row. */
export async function setLikedPhotoRemote(ownerId: string, photoId: string, liked: boolean) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = liked
    ? await supabase.from(LIKED_PHOTOS_TABLE).upsert({ user_id: ownerId, photo_id: photoId })
    : await supabase.from(LIKED_PHOTOS_TABLE).delete().eq("user_id", ownerId).eq("photo_id", photoId);

  if (error) console.warn("Unable to save the like toggle to Supabase.", error.message);
}

/** Upserts a (user, photo) view receipt -- `viewed_at` is bumped on repeat
 * views of the same photo instead of appending to an ever-growing array. */
export async function markPhotoViewedRemote(ownerId: string, photoId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase
    .from(VIEWED_PHOTOS_TABLE)
    .upsert({ user_id: ownerId, photo_id: photoId, viewed_at: new Date().toISOString() });

  if (error) console.warn("Unable to record the photo view in Supabase.", error.message);
}

/**
 * Real aggregate save counts (docs/demo-to-product-audit.md item 7) via the
 * `place_save_counts()` SECURITY DEFINER function (see
 * 20260710000700_fix_place_save_counts_security_definer.sql) -- a narrow
 * public aggregate over the owner-scoped `saved_places` table, returning
 * only place_id + count, never who saved what.
 */
export async function loadPlaceSaveCounts(): Promise<Record<string, number>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return {};

  const { data, error } = await supabase.rpc(PLACE_SAVE_COUNTS_FN);
  if (error) {
    console.warn("Unable to load Oculi place save counts from Supabase.", error.message);
    return {};
  }

  const counts: Record<string, number> = {};
  (data as Array<{ place_id: unknown; save_count: unknown }> | null)?.forEach((row) => {
    if (typeof row.place_id === "string" && typeof row.save_count === "number") {
      counts[row.place_id] = row.save_count;
    }
  });
  return counts;
}

export async function loadRemoteDemoCatalog(): Promise<DemoCatalog> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return seedCatalog;

  const [catalogResult, photosResult, saveCounts] = await Promise.all([
    supabase
      .from(CATALOG_TABLE)
      .select("kind,item_id,payload")
      .order("item_id", { ascending: true })
      .returns<CatalogRow[]>(),
    supabase
      .from(PHOTOS_TABLE)
      .select("id,owner_id,place_id,caption,image_url,tags,shot_at_time_of_day,location_label,like_count,created_at,moderation_status")
      .returns<PhotoRow[]>(),
    loadPlaceSaveCounts(),
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

  const mergedPlaces = mergeById(seedCatalog.places, remoteCatalog.places);

  return {
    users: mergeById(seedCatalog.users, remoteCatalog.users),
    areas: mergeById(seedCatalog.areas, remoteCatalog.areas),
    // Real saveCount overlay (docs/demo-to-product-audit.md item 7): the
    // seed/catalog value is a static demo baseline (e.g. 842); real saves
    // recorded in `saved_places` are added on top so the number actually
    // moves when someone saves/unsaves the place, while keeping the existing
    // demo-flavor baseline and scoring order intact.
    places: mergedPlaces.map((place) => ({
      ...place,
      saveCount: place.saveCount + (saveCounts[place.id] ?? 0),
    })),
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

  if (error) {
    console.warn("Unable to save Oculi photo to Supabase.", error.message);
    throw error;
  }
}

export async function resetRemoteDemoState(stateOwnerId = currentUserId) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(STATE_TABLE).delete().eq("user_id", stateOwnerId);
  if (error) console.warn("Unable to reset Oculi state in Supabase.", error.message);

  await Promise.all([
    supabase.from(SAVED_PLACES_TABLE).delete().eq("user_id", stateOwnerId),
    supabase.from(FOLLOWED_USERS_TABLE).delete().eq("user_id", stateOwnerId),
    supabase.from(LIKED_PHOTOS_TABLE).delete().eq("user_id", stateOwnerId),
    supabase.from(VIEWED_PHOTOS_TABLE).delete().eq("user_id", stateOwnerId),
  ]).catch((error) => console.warn("Unable to reset Oculi user relations in Supabase.", error));
}

export async function uploadPhotoFile(file: File, photoId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.warn("Unable to identify the Oculi photo owner.", userError?.message ?? "No active user.");
    return null;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userData.user.id}/${photoId}.${extension}`;
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
  return { publicUrl: data.publicUrl, path };
}

export async function deleteUploadedPhotoFile(path: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) {
    console.warn("Unable to clean up an unpublished Oculi photo.", error.message);
  }
}
