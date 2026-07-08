import { currentUserId } from "./data";
import { createInitialDemoState } from "./storage";
import { getSupabaseBrowserClient } from "./supabase";
import type { DemoState } from "./types";

const STATE_TABLE = "oculi_demo_states";
const PHOTO_BUCKET = "oculi-photos";

type StateRow = {
  user_id: string;
  state: DemoState;
  updated_at?: string;
};

function normalizeDemoState(state?: Partial<DemoState> | null): DemoState {
  const initial = createInitialDemoState();

  return {
    ...initial,
    ...(state ?? {}),
    savedPlaceIds: state?.savedPlaceIds ?? initial.savedPlaceIds,
    followedUserIds: state?.followedUserIds ?? initial.followedUserIds,
    likedPhotoIds: state?.likedPhotoIds ?? initial.likedPhotoIds,
    viewedPlaceIds: state?.viewedPlaceIds ?? initial.viewedPlaceIds,
    placeViews: state?.placeViews ?? initial.placeViews,
    discoveryActiveIndex: state?.discoveryActiveIndex ?? initial.discoveryActiveIndex,
    uploadedPhotos: state?.uploadedPhotos ?? initial.uploadedPhotos,
  };
}

export function isRemoteStateEnabled() {
  return Boolean(getSupabaseBrowserClient());
}

export async function loadRemoteDemoState(): Promise<DemoState> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return createInitialDemoState();

  const { data, error } = await supabase
    .from(STATE_TABLE)
    .select("state")
    .eq("user_id", currentUserId)
    .maybeSingle<StateRow>();

  if (error) {
    console.warn("Unable to load Oculi state from Supabase.", error.message);
    return createInitialDemoState();
  }

  return normalizeDemoState(data?.state);
}

export async function saveRemoteDemoState(state: DemoState) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(STATE_TABLE).upsert({
    user_id: currentUserId,
    state,
    updated_at: new Date().toISOString(),
  });

  if (error) console.warn("Unable to save Oculi state to Supabase.", error.message);
}

export async function resetRemoteDemoState() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from(STATE_TABLE).delete().eq("user_id", currentUserId);
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
