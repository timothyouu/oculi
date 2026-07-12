// Pure, DOM-free helper (Task 9, docs/demo-to-product-audit.md item 10): the Place/Photo/User
// data model has no attribution field, but a meaningful slice of catalog imagery is sourced
// from Wikimedia Commons (and, historically, Unsplash) rather than Oculi's own storage. This
// derives a small attribution label + link straight from the image URL's host/path so it can be
// surfaced next to full-size photo renders without adding a new stored field. Returns null for
// anything we don't need/can't ethically claim attribution for: Oculi's own Supabase storage
// uploads, local/generated demo assets, and transient blob/data preview URLs.
export type ImageAttribution = {
  label: string;
  href: string;
};

const WIKIMEDIA_HOST = "upload.wikimedia.org";
const UNSPLASH_HOSTS = new Set(["images.unsplash.com", "source.unsplash.com"]);

/**
 * Derives the Wikimedia Commons "File:" page URL from a Wikimedia upload URL's filename.
 * Upload URLs look like:
 *   https://upload.wikimedia.org/wikipedia/commons/a/ab/Some_File_Name.jpg
 *   https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Some_File_Name.jpg/640px-Some_File_Name.jpg
 * In both cases the original filename is the path segment immediately after the two
 * single-character hash directories (and, for thumbnails, before the extra "/thumb/" segment
 * and the resized-copy segment at the end).
 */
function wikimediaFilePageUrl(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const isThumb = segments[2] === "thumb";
  // Non-thumb: ["wikipedia","commons", hash1, hash2, filename]
  // Thumb:     ["wikipedia","commons","thumb", hash1, hash2, filename, resizedFilename]
  const filenameIndex = isThumb ? 5 : 4;
  const filename = segments[filenameIndex];
  if (!filename) return null;

  return `https://commons.wikimedia.org/wiki/File:${filename}`;
}

/**
 * Returns attribution { label, href } for an externally hosted image URL, or null when the
 * image is Oculi's own storage, a local/static asset, or a transient blob/data preview URL that
 * has no stable source to link to.
 */
export function attributionForImageUrl(url: string): ImageAttribution | null {
  if (!url) return null;
  if (url.startsWith("blob:") || url.startsWith("data:")) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not an absolute URL -- local/relative asset path (e.g. /generated/...), no attribution.
    return null;
  }

  if (parsed.hostname === WIKIMEDIA_HOST) {
    const filePageUrl = wikimediaFilePageUrl(parsed.pathname);
    return {
      label: "via Wikimedia Commons",
      href: filePageUrl ?? "https://commons.wikimedia.org/",
    };
  }

  if (UNSPLASH_HOSTS.has(parsed.hostname)) {
    return {
      label: "via Unsplash",
      href: "https://unsplash.com/",
    };
  }

  return null;
}

// Hosts whose images should be fetched by the *browser*, directly, instead of being proxied
// through next/image's server-side optimizer (/_next/image). Wikimedia's CDN rate-limits the
// optimizer hard: every image request funnels through the one server IP, and upload.wikimedia.org
// answers cold-start bursts with 429s ("upstream image response failed"), degrading whole pages
// to the ResilientImage fallback. Before the next/image migration, browsers hit Wikimedia's CDN
// from per-user IPs with proper caching and this never happened -- `unoptimized` restores exactly
// that fetch behavior while keeping next/image's lazy-loading/layout benefits. Own-storage
// (Supabase) and local assets stay optimized.
const OPTIMIZER_BYPASS_HOSTS = new Set([WIKIMEDIA_HOST]);

/**
 * Returns true when an image URL must be rendered with next/image's `unoptimized` prop so the
 * browser fetches it directly from the source CDN rather than through /_next/image.
 */
export function shouldBypassImageOptimizer(url: string): boolean {
  try {
    return OPTIMIZER_BYPASS_HOSTS.has(new URL(url).hostname);
  } catch {
    // Relative/local path, blob:, data:, etc. -- not a remote host we need to bypass for.
    return false;
  }
}
