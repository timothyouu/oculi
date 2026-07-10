import { createRateLimiter } from "@/lib/rate-limit";

const MAPBOX_API_HOST = "api.mapbox.com";

// Demo-scale per-IP limit: a single map load fires many rapid tile/style/
// sprite/glyph requests through this proxy, so this must stay generous
// enough that a normal session never trips it while still damping a
// runaway/abusive client. See lib/rate-limit.ts for the serverless
// (per-instance, best-effort — not a hard global quota) caveat.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 300;
const rateLimiter = createRateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_REQUESTS });

// Fallback Cache-Control for static-ish Mapbox assets (styles, sprites,
// glyphs, fonts, tiles) when Mapbox doesn't send its own cache header.
const DEFAULT_STATIC_CACHE_CONTROL = "public, max-age=3600";

function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor.split(",")[0]?.trim();
    if (firstHop) return firstHop;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

function normalizeReferrerOrigin(value: string) {
  const url = new URL(value);
  return `${url.origin}/`;
}

function mapboxReferrerOrigin(request: Request) {
  const configuredOrigin = process.env.MAPBOX_REFERRER_ORIGIN || process.env.NEXT_PUBLIC_MAPBOX_REFERRER_ORIGIN;
  if (configuredOrigin) return normalizeReferrerOrigin(configuredOrigin);

  return normalizeReferrerOrigin(request.url);
}

function localhostFallbackReferrer(request: Request, primaryReferrer: string) {
  const requestUrl = new URL(request.url);
  const fallbackReferrer = "http://localhost:3000/";

  if (requestUrl.hostname !== "localhost" && requestUrl.hostname !== "127.0.0.1") return null;
  if (primaryReferrer === fallbackReferrer) return null;

  return fallbackReferrer;
}

function forwardedMapboxHeaders(response: Response) {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const cacheControl = response.headers.get("cache-control");

  if (contentType) headers.set("content-type", contentType);

  // Successful responses get a cache-control header so browsers/CDN can
  // cache static-ish Mapbox assets (styles, sprites, glyphs, fonts, tiles).
  // Prefer Mapbox's own cache header when present; otherwise fall back to a
  // reasonable default. Error responses (checked by the caller) are never
  // cached.
  if (response.ok) {
    headers.set("cache-control", cacheControl || DEFAULT_STATIC_CACHE_CONTROL);
  } else {
    headers.set("cache-control", "no-store");
  }

  return headers;
}

export async function GET(request: Request) {
  const rateLimitResult = rateLimiter.check(clientIp(request));
  if (!rateLimitResult.allowed) {
    return new Response("Too many requests.", {
      status: 429,
      headers: {
        "retry-after": String(rateLimitResult.retryAfterSeconds ?? 60),
        "cache-control": "no-store",
      },
    });
  }

  const requestUrl = new URL(request.url);
  const targetUrlParam = requestUrl.searchParams.get("url");

  if (!targetUrlParam) {
    return new Response("Missing Mapbox URL.", { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetUrlParam);
  } catch {
    return new Response("Invalid Mapbox URL.", { status: 400 });
  }

  if (targetUrl.protocol !== "https:" || targetUrl.hostname !== MAPBOX_API_HOST) {
    return new Response("Only Mapbox API requests can be proxied.", { status: 400 });
  }

  const referrerOrigin = mapboxReferrerOrigin(request);
  let mapboxResponse = await fetch(targetUrl, {
    headers: {
      accept: request.headers.get("accept") || "*/*",
      origin: new URL(referrerOrigin).origin,
      referer: referrerOrigin,
    },
  });

  const fallbackReferrer = localhostFallbackReferrer(request, referrerOrigin);
  if (fallbackReferrer && (mapboxResponse.status === 401 || mapboxResponse.status === 403)) {
    mapboxResponse = await fetch(targetUrl, {
      headers: {
        accept: request.headers.get("accept") || "*/*",
        origin: new URL(fallbackReferrer).origin,
        referer: fallbackReferrer,
      },
    });
  }

  return new Response(mapboxResponse.body, {
    status: mapboxResponse.status,
    statusText: mapboxResponse.statusText,
    headers: forwardedMapboxHeaders(mapboxResponse),
  });
}
