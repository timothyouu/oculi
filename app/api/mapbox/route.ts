const MAPBOX_API_HOST = "api.mapbox.com";
const DEFAULT_MAPBOX_REFERRER_ORIGIN = "http://localhost:3000/";

function mapboxReferrerOrigin() {
  const configuredOrigin = process.env.MAPBOX_REFERRER_ORIGIN || process.env.NEXT_PUBLIC_MAPBOX_REFERRER_ORIGIN;
  return configuredOrigin || DEFAULT_MAPBOX_REFERRER_ORIGIN;
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

  const mapboxResponse = await fetch(targetUrl, {
    headers: {
      accept: request.headers.get("accept") || "*/*",
      referer: mapboxReferrerOrigin(),
    },
  });

  return new Response(mapboxResponse.body, {
    status: mapboxResponse.status,
    statusText: mapboxResponse.statusText,
    headers: forwardedMapboxHeaders(mapboxResponse),
  });
}
