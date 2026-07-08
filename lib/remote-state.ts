import { areas, currentUserId, photos, places, users } from "./data";
import { createInitialDemoState, normalizeDemoState } from "./storage";
import { getSupabaseBrowserClient } from "./supabase";
import type { Area, DemoState, Photo, Place, User } from "./types";

const STATE_TABLE = "oculi_demo_states";
const CATALOG_TABLE = "oculi_demo_catalog_items";
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

  const { data, error } = await supabase
    .from(CATALOG_TABLE)
    .select("kind,item_id,payload")
    .order("item_id", { ascending: true })
    .returns<CatalogRow[]>();

  if (error) {
    console.warn("Unable to load Oculi catalog from Supabase.", error.message);
    return seedCatalog;
  }

  const remoteCatalog: DemoCatalog = {
    users: [],
    areas: [],
    places: [],
    photos: [],
  };

  data?.forEach((row) => {
    const catalogKind = tableKindToCatalogKind(row.kind);
    if (!isCatalogKind(catalogKind)) return;
    remoteCatalog[catalogKind].push(row.payload as never);
  });

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

  if (error) console.warn("Unable to save Oculi state to Supabase.", error.message);
}

export async function saveRemoteCatalogPhoto(photo: Photo) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(CATALOG_TABLE).upsert({
    kind: "photo",
    item_id: photo.id,
    payload: photo,
    updated_at: new Date().toISOString(),
  });

  if (error) console.warn("Unable to save Oculi photo catalog item to Supabase.", error.message);
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
