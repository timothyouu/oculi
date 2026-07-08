export type MapboxFallbackParams = {
  requireMapbox: boolean;
  hasAccessToken: boolean;
  unauthorized: boolean;
};

// Decide whether to render the stylized fallback instead of the live Mapbox map.
// Only two conditions justify abandoning the live map: there is no access token
// at all, or Mapbox returned a confirmed auth rejection (401/403). Transient
// Mapbox GL error events (tiles canceled during a pan, sprite/glyph hiccups, a
// single 404 tile) must NOT trigger the fallback, otherwise a working map gets
// torn down and its markers disappear.
export function shouldFallbackToStylizedMap({
  requireMapbox,
  hasAccessToken,
  unauthorized,
}: MapboxFallbackParams): boolean {
  if (requireMapbox) return false;
  return !hasAccessToken || unauthorized;
}
