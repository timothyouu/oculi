export type MapboxFallbackParams = {
  requireMapbox: boolean;
  hasAccessToken: boolean;
  unauthorized: boolean;
  webglFailed?: boolean;
};

// Decide whether to render the stylized fallback instead of the live Mapbox map.
// Only three conditions justify abandoning the live map: the browser has no
// working WebGL (`new mapboxgl.Map()` throws synchronously — uncaught, it
// unmounts the entire React tree, which is strictly worse than the stylized
// map, so this overrides even `requireMapbox`), there is no access token at
// all, or Mapbox returned a confirmed auth rejection (401/403). Transient
// Mapbox GL error events (tiles canceled during a pan, sprite/glyph hiccups, a
// single 404 tile) must NOT trigger the fallback, otherwise a working map gets
// torn down and its markers disappear.
export function shouldFallbackToStylizedMap({
  requireMapbox,
  hasAccessToken,
  unauthorized,
  webglFailed = false,
}: MapboxFallbackParams): boolean {
  if (webglFailed) return true;
  if (requireMapbox) return false;
  return !hasAccessToken || unauthorized;
}
