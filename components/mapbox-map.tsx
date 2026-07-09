"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { SelectedPlaceCard } from "@/components/selected-place-card";
import type { Map as MapboxMapInstance, Marker } from "mapbox-gl";
import type { Photo, Place } from "@/lib/types";
import { buildPlacePhotoNodes, clusterProjectedPlacePhotoNodes, clusterSizeForZoom } from "@/lib/map-clusters";
import { shouldFallbackToStylizedMap } from "@/lib/mapbox-fallback";
import { loadMapCameraView, saveMapCameraView } from "@/lib/storage";
import { StylizedMap } from "./stylized-map";

type MapboxMapProps = {
  places: Place[];
  photos?: Photo[];
  selectedPlaceId?: string;
  savedPlaceIds?: string[];
  onSelectPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  onCloseSelected?: () => void;
  showSelectedCard?: boolean;
  autoFocusSelected?: boolean;
  /**
   * Imperative request to smoothly fit the camera over a specific set of nearby
   * places (used by "Near me"). `nonce` bumps on every request so clicking the
   * button again re-runs the fit even if the same place ids are targeted.
   */
  focusRequest?: { placeIds: string[]; nonce: number };
  requireMapbox?: boolean;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fitPlaces(map: MapboxMapInstance, places: Place[], showSelectedCard: boolean) {
  if (!places.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  places.forEach((place) => bounds.extend([place.lng, place.lat]));

  if (places.length === 1) {
    // `essential: true` keeps this an animated transition even when the
    // browser reports prefers-reduced-motion, which Mapbox GL otherwise
    // honors by jumping straight to the end state with no animation at all.
    // This camera movement is core UX (showing the user where they landed),
    // not decorative motion, so it stays animated either way.
    map.easeTo({ center: [places[0].lng, places[0].lat], zoom: 13.5, duration: 650, essential: true });
    return;
  }

  map.fitBounds(bounds, {
    padding: showSelectedCard ? { top: 90, right: 420, bottom: 90, left: 90 } : 48,
    maxZoom: 13.2,
    duration: 800,
    essential: true,
  });
}

function proxiedMapboxUrl(url: string) {
  if (!url.startsWith("https://api.mapbox.com/")) return url;

  const proxyUrl = new URL("/api/mapbox", window.location.origin);
  proxyUrl.searchParams.set("url", url);
  return proxyUrl.toString();
}

export function MapboxMap({
  places,
  photos = [],
  selectedPlaceId,
  savedPlaceIds = [],
  onSelectPlace,
  onToggleSaved,
  onOpenPlace,
  onCloseSelected,
  showSelectedCard = true,
  autoFocusSelected = true,
  focusRequest,
  requireMapbox = false,
  className,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const hasRestoredCameraRef = useRef(false);
  const suppressNextAutoFocusRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapUnauthorized, setMapUnauthorized] = useState(false);
  const [mapZoom, setMapZoom] = useState(11.1);
  const [mapViewTick, setMapViewTick] = useState(0);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const selected = places.find((place) => place.id === selectedPlaceId);
  const placeNodes = useMemo(() => buildPlacePhotoNodes(places, photos), [photos, places]);
  const shouldUseStylizedFallback = shouldFallbackToStylizedMap({
    requireMapbox,
    hasAccessToken: Boolean(accessToken),
    unauthorized: mapUnauthorized,
  });
  const visiblePlaceClusters = useMemo(() => {
    void mapViewTick;
    const map = mapRef.current;
    const clusterRadius = clusterSizeForZoom(mapZoom);
    if (!map || !mapReady) return [];

    return clusterProjectedPlacePhotoNodes(placeNodes, clusterRadius, (place) => {
      const point = map.project([place.lng, place.lat]);
      return { x: point.x, y: point.y };
    });
  }, [mapReady, mapViewTick, mapZoom, placeNodes]);

  useEffect(() => {
    if (!accessToken || shouldUseStylizedFallback || !containerRef.current || mapRef.current) return;

    setMapError("");
    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-122.454, 37.787],
      zoom: 11.1,
      pitch: 0,
      attributionControl: false,
      transformRequest: (url) => ({
        url: proxiedMapboxUrl(url),
        referrerPolicy: "origin",
      }),
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    const handleLoad = () => {
      setMapReady(true);
    };
    const handleError = (event: { error?: { message?: string; status?: number } }) => {
      const status = event.error?.status;
      // Mapbox GL emits `error` events for transient, non-fatal reasons (tiles
      // canceled during a pan, sprite/glyph fetch hiccups, a single 404 tile).
      // Only a hard auth rejection means the live map genuinely can't work, so
      // only that should fall back to the stylized map.
      if (status !== 401 && status !== 403) return;
      setMapUnauthorized(true);
      setMapError("Mapbox rejected the token or referrer for this domain.");
    };

    map.on("load", handleLoad);
    map.on("error", handleError);

    mapRef.current = map;

    return () => {
      map.off("load", handleLoad);
      map.off("error", handleError);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [accessToken, shouldUseStylizedFallback]);

  useEffect(() => {
    if (!shouldUseStylizedFallback || !mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    mapRef.current.remove();
    mapRef.current = null;
    setMapReady(false);
  }, [shouldUseStylizedFallback]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const updateZoom = () => setMapZoom(map.getZoom());
    const updateView = () => setMapViewTick((tick) => tick + 1);
    // Persist wherever the visitor leaves the camera so reopening the map
    // lands back in the same spot instead of re-fitting to every place.
    const persistCamera = () => {
      const center = map.getCenter();
      saveMapCameraView({ center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
    };

    updateZoom();
    updateView();
    map.on("zoom", updateZoom);
    map.on("moveend", updateView);
    map.on("moveend", persistCamera);
    map.on("resize", updateView);

    return () => {
      map.off("zoom", updateZoom);
      map.off("moveend", updateView);
      map.off("moveend", persistCamera);
      map.off("resize", updateView);
    };
  }, [mapReady]);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    const allowedOrigin = window.location.origin;
    const tileHealthCheckUrl = proxiedMapboxUrl(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2,mapbox.mapbox-bathymetry-v2/11/327/791.vector.pbf?access_token=${accessToken}`);

    fetch(tileHealthCheckUrl, { referrerPolicy: "origin", signal: controller.signal })
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          setMapUnauthorized(true);
          setMapError(`Mapbox is connected, but Mapbox is returning ${response.status} for vector tiles. Check that the token has styles:read and fonts:read, allows ${allowedOrigin}, and is not using a noreferrer or same-origin referrer policy.`);
          return;
        }
        setMapUnauthorized(false);
        setMapError("");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // A network hiccup is not an auth failure — surface a banner but keep the live map.
        setMapError("Mapbox is connected, but the app could not load map tiles from Mapbox.");
      });

    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = visiblePlaceClusters.map((cluster) => {
      const markerButton = document.createElement("button");
      const isSelected = cluster.places.some((place) => place.id === selected?.id);
      const isSaved = cluster.places.some((place) => savedPlaceIds.includes(place.id));
      const countLabel = document.createElement("span");
      const clusterName = cluster.places.length === 1 ? cluster.primaryPlace.name : `${cluster.label}, ${cluster.places.length} places`;
      const photoLabel = `${cluster.photoCount} photo${cluster.photoCount === 1 ? "" : "s"}`;

      markerButton.type = "button";
      markerButton.style.zIndex = isSelected ? "25" : "20";
      markerButton.setAttribute("aria-label", `Select ${clusterName}, ${photoLabel}`);
      markerButton.title = `${clusterName} · ${photoLabel}`;
      markerButton.className = cx(
        "inline-grid h-11 min-w-11 place-items-center rounded-full border-2 px-3 font-sans text-sm font-semibold leading-none shadow-[0_8px_18px_rgba(29,29,27,0.24)] transition hover:scale-105",
        isSelected
          ? "scale-110 border-[var(--paper-strong)] bg-[var(--paper-strong)] text-[var(--moss-dark)] ring-2 ring-[var(--moss)]"
          : isSaved
            ? "border-white bg-[var(--moss)] text-white"
            : "border-white bg-[var(--moss-dark)] text-white",
      );
      countLabel.textContent = String(cluster.photoCount);
      countLabel.className = "leading-none";
      markerButton.append(countLabel);
      markerButton.addEventListener("click", () => {
        if (cluster.places.length > 1) {
          // Fit to the cluster's own bounding box (instead of a flat zoom
          // step) so a click on a tight group of nodes zooms in exactly far
          // enough to separate them, even if they're only a block apart.
          const clusterBounds = new mapboxgl.LngLatBounds();
          cluster.places.forEach((place) => clusterBounds.extend([place.lng, place.lat]));

          const fitOptions = { padding: 96, maxZoom: 16 };
          const currentZoom = map.getZoom();
          const targetCamera = map.cameraForBounds(clusterBounds, fitOptions);

          // Clustering groups nodes by on-screen pixel distance, not geographic
          // distance, so at low zoom (e.g. the initial world view) a "cluster"
          // can contain places spread across continents. Their true bounding
          // box is then nearly the whole visible world already, so fitBounds
          // barely moves the camera. Detect that degenerate case and fall back
          // to a flat zoom step centered on the cluster so the click always
          // makes visible progress toward separating it.
          if (targetCamera?.zoom !== undefined && targetCamera.zoom > currentZoom + 0.5) {
            map.fitBounds(clusterBounds, { ...fitOptions, duration: 650, essential: true });
          } else {
            map.easeTo({
              center: [cluster.lng, cluster.lat],
              zoom: Math.min(currentZoom + 3, 16),
              duration: 650,
              essential: true,
            });
          }
        } else {
          // A lone marker previously opened its place card with no camera
          // movement at all, so the card (and its full-size photo) appeared
          // instantly while the map camera stayed wherever it was - a jarring
          // cut when that was still a zoomed-out view. Ease in to the place
          // so selecting it always feels like a smooth zoom, never a jump cut.
          // `essential: true` on every camera call in this file keeps that
          // animation playing even when the browser reports
          // prefers-reduced-motion (Mapbox GL otherwise jumps straight to
          // the end position with no animation at all in that case - this
          // was reported working in local/Playwright testing, which doesn't
          // set that media flag, but not in a real deployed browser).
          map.easeTo({
            center: [cluster.primaryPlace.lng, cluster.primaryPlace.lat],
            zoom: Math.max(map.getZoom(), 13.5),
            duration: 650,
            essential: true,
          });
        }
        onSelectPlace?.(cluster.primaryPlace.id);
      });

      return new mapboxgl.Marker({ element: markerButton, anchor: "center" }).setLngLat([cluster.lng, cluster.lat]).addTo(map);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [mapReady, mapZoom, onSelectPlace, savedPlaceIds, selected?.id, showSelectedCard, visiblePlaceClusters]);

  // Re-fit the camera to the full place set when which places are visible
  // actually changes (e.g. a filter narrows the results) - but not merely
  // when `places` gets a new array reference from re-sorting (selecting a
  // place calls recordPlaceView, which bumps recentActivityScore and
  // re-sorts topPlaces upstream). Keying on the sorted id set instead of the
  // array reference stops that resort from cancelling an in-flight cluster
  // zoom animation by snapping the camera back out to fit everything.
  const visiblePlaceIdsKey = useMemo(() => places.map((place) => place.id).sort().join(","), [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // On the very first mount, restore wherever the visitor left the camera
    // instead of re-fitting to every place - reopening the map should land
    // back in the same spot, not reset the view. Later re-fits (the visible
    // place set actually changing, e.g. a filter) still use fitPlaces as
    // normal. Suppress the one-shot restored-selection autofocus below so it
    // doesn't immediately pan away from the camera we just restored.
    if (!hasRestoredCameraRef.current) {
      hasRestoredCameraRef.current = true;
      const savedCamera = loadMapCameraView();
      if (savedCamera) {
        map.jumpTo(savedCamera);
        suppressNextAutoFocusRef.current = true;
        return;
      }
    }

    fitPlaces(map, places, showSelectedCard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, visiblePlaceIdsKey, showSelectedCard]);

  useEffect(() => {
    const map = mapRef.current;
    if (!autoFocusSelected || !map || !mapReady || !selected) return;
    if (suppressNextAutoFocusRef.current) {
      suppressNextAutoFocusRef.current = false;
      return;
    }
    map.easeTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 12.8), duration: 650, essential: true });
  }, [autoFocusSelected, mapReady, selected]);

  // "Near me": smoothly fit the camera over the requested nearby places so the
  // surrounding-area nodes come into view together, rather than snapping to a
  // single pin. Keyed on the request nonce so a repeat click re-runs the fit;
  // `places` is read inside but intentionally left out of the deps so a resort
  // (recordPlaceView bumping recentActivityScore) can't retrigger it. The
  // one-shot autofocus is suppressed so selecting the anchor place below doesn't
  // immediately zoom past this neighborhood view onto that single place.
  const focusNonce = focusRequest?.nonce;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusRequest?.placeIds.length) return;

    const focusPlaces = places.filter((place) => focusRequest.placeIds.includes(place.id));
    if (!focusPlaces.length) return;

    suppressNextAutoFocusRef.current = true;
    fitPlaces(map, focusPlaces, showSelectedCard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, mapReady, showSelectedCard]);

  // Dismissing the card leaves the camera zoomed in tight on just the one
  // place - back off a couple zoom levels so the surrounding spots that
  // were clustered away or off-screen become visible again.
  function handleCloseSelected() {
    const map = mapRef.current;
    if (map) {
      map.easeTo({ zoom: Math.max(map.getZoom() - 2.5, 3), duration: 650, essential: true });
    }
    onCloseSelected?.();
  }

  if (shouldUseStylizedFallback) {
    return (
      <div className="relative h-full">
        <StylizedMap
          places={places}
          photos={photos}
          selectedPlaceId={selectedPlaceId}
          savedPlaceIds={savedPlaceIds}
          onSelectPlace={onSelectPlace}
          onToggleSaved={onToggleSaved}
          onOpenPlace={onOpenPlace}
          onCloseSelected={onCloseSelected}
          showSelectedCard={showSelectedCard}
          className={className}
        />
        <div className="absolute left-5 top-5 z-30 max-w-sm rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_12px_30px_rgba(39,34,27,0.12)]">
          {mapError || (
            <>
              Add <span className="font-sans">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</span> to .env and restart the dev server to enable Mapbox.
            </>
          )}
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <section className={cx("relative grid place-items-center overflow-hidden bg-[#dfe8df]", className)} aria-label="Mapbox map unavailable">
        <div className="max-w-sm rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_12px_30px_rgba(39,34,27,0.12)]">
          Add <span className="font-sans">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</span> to .env and restart the dev server to show the live Mapbox location preview.
        </div>
      </section>
    );
  }

  return (
    <section className={cx("relative overflow-hidden rounded-none bg-[#dfe8df]", className)} aria-label="Live Mapbox map">
      {/* mapbox-gl.css forces `.mapboxgl-map { position: relative }`, which
          overrides Tailwind's `absolute`; `inset-0` then can't stretch the
          container and it collapses to 0 height, leaving the map blank. Size it
          with explicit width/height so it fills the positioned section instead. */}
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[rgba(255,253,248,0.62)] to-transparent" />
      {mapError ? (
        <div className="pointer-events-none absolute left-5 top-5 z-30 max-w-md rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_12px_30px_rgba(39,34,27,0.12)]">
          {mapError}
        </div>
      ) : null}

      {showSelectedCard && selected ? (
        <div className="absolute bottom-8 right-8 z-20 w-[340px] overflow-hidden rounded-[22px] border border-white/60 bg-[var(--paper-strong)] shadow-[0_18px_50px_rgba(39,34,27,0.18)] max-md:inset-x-4 max-md:bottom-4 max-md:w-auto">
          <SelectedPlaceCard
            place={selected}
            photos={photos}
            isSaved={savedPlaceIds.includes(selected.id)}
            onToggleSaved={onToggleSaved}
            onOpenPlace={onOpenPlace}
            onClose={handleCloseSelected}
          />
        </div>
      ) : null}
    </section>
  );
}
