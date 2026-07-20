import type { PhotoAttribution } from "./types";

const WIKIMEDIA_HOST = "upload.wikimedia.org";

/**
 * Derives a Wikimedia Commons file-page URL from a hotlinked
 * upload.wikimedia.org image URL, without needing per-photo curation.
 *
 * Handles both URL shapes seen in lib/data.ts:
 *   .../wikipedia/commons/thumb/c/c2/Golden_Gate_Bridge_by_night.jpg/960px-Golden_Gate_Bridge_by_night.jpg
 *   .../wikipedia/commons/c/c2/Golden_Gate_Bridge_by_night.jpg
 * by capturing the filename immediately after the two single/double-hex
 * hash directories, ignoring any trailing "/960px-..." resize segment.
 *
 * Returns null for any URL that isn't hosted on upload.wikimedia.org, or
 * whose path doesn't match the expected Commons layout.
 */
export function deriveWikimediaCommonsUrl(imageUrl: string): string | null {
  if (typeof imageUrl !== "string" || !imageUrl.includes(WIKIMEDIA_HOST)) return null;

  const match = imageUrl.match(/\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)(?:\/.+)?$/i);
  if (!match) return null;

  const filename = match[1];
  if (!filename) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    decoded = filename;
  }

  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(decoded)}`;
}

/**
 * Resolves the attribution to show for a photo: an explicit attribution
 * (curated on the Photo record) always wins; otherwise derive an interim
 * "Wikimedia Commons" credit from the image URL when possible. Returns
 * null when neither is available (e.g. local/generated placeholder art,
 * uploaded photos, or non-Wikimedia hotlinks) -- callers should render
 * nothing in that case, never a fabricated credit.
 */
export function attributionForPhoto(
  imageUrl: string,
  explicit?: PhotoAttribution | null,
): PhotoAttribution | null {
  if (explicit && (explicit.author || explicit.license || explicit.sourceUrl)) {
    return explicit;
  }

  const commonsUrl = deriveWikimediaCommonsUrl(imageUrl);
  if (!commonsUrl) return null;

  return { license: "Wikimedia Commons", sourceUrl: commonsUrl };
}

/** Short display label for an attribution, e.g. "Wikimedia Commons" or "Jane Doe · CC BY-SA". */
export function attributionLabel(attribution: PhotoAttribution): string {
  return [attribution.author, attribution.license].filter(Boolean).join(" · ") || "Source";
}

/**
 * Hosts the next/image optimizer is allowed to fetch from. Must mirror
 * next.config.mjs `images.remotePatterns` -- an <Image> whose remote src
 * falls outside this list throws/400s instead of rendering, so callers use
 * `isOptimizerAllowedSrc` to fall back to `unoptimized` for sources we
 * can't vouch for (user-typed avatar URLs, blob:/data: upload previews).
 */
const OPTIMIZER_ALLOWED_HOSTS = new Set(["upload.wikimedia.org", "xlzknvhiuhtcqmqrypqh.supabase.co"]);

/** True when `src` is safe to run through the next/image optimizer: a local public asset or an allowlisted https host. */
export function isOptimizerAllowedSrc(src: string): boolean {
  if (typeof src !== "string" || !src) return false;
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && OPTIMIZER_ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
