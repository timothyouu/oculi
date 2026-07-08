const MAPBOX_API_HOST = "api.mapbox.com";

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
  if (cacheControl) headers.set("cache-control", cacheControl);

  return headers;
}

export async function GET(request: Request) {
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
