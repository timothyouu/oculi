"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { SelectedPlaceCard } from "@/components/selected-place-card";
import type { Map as MapboxMapInstance, Marker } from "mapbox-gl";
import type { Photo, Place } from "@/lib/types";
import { buildPlacePhotoNodes, clusterProjectedPlacePhotoNodes, clusterSizeForZoom } from "@/lib/map-clusters";
import { StylizedMap } from "./stylized-map";

type MapboxMapProps = {
  places: Place[];
  photos?: Photo[];
  selectedPlaceId?: string;
  savedPlaceIds?: string[];
  onSelectPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  showSelectedCard?: boolean;
  autoFocusSelected?: boolean;
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
    map.easeTo({ center: [places[0].lng, places[0].lat], zoom: 13.5, duration: 650 });
    return;
  }

  map.fitBounds(bounds, {
    padding: showSelectedCard ? { top: 90, right: 420, bottom: 90, left: 90 } : 48,
    maxZoom: 13.2,
    duration: 800,
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
  showSelectedCard = true,
  autoFocusSelected = true,
  requireMapbox = false,
  className,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapZoom, setMapZoom] = useState(11.1);
  const [mapViewTick, setMapViewTick] = useState(0);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const selected = places.find((place) => place.id === selectedPlaceId) || places[0];
  const placeNodes = useMemo(() => buildPlacePhotoNodes(places, photos), [photos, places]);
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
    if (!accessToken || !containerRef.current || mapRef.current) return;

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
    map.on("load", () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [accessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const updateZoom = () => setMapZoom(map.getZoom());
    const updateView = () => setMapViewTick((tick) => tick + 1);

    updateZoom();
    updateView();
    map.on("zoom", updateZoom);
    map.on("moveend", updateView);
    map.on("resize", updateView);

    return () => {
      map.off("zoom", updateZoom);
      map.off("moveend", updateView);
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
          setMapError(`Mapbox is connected, but Mapbox is returning 403 for vector tiles. Check that the token has styles:read and fonts:read, allows ${allowedOrigin}, and is not using a noreferrer or same-origin referrer policy.`);
          return;
        }
        setMapError("");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
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
          const targetZoom = Math.min(Math.max(mapZoom + 2.4, 12.8), 15);
          setMapZoom(targetZoom);
          setMapViewTick((tick) => tick + 1);
          map.easeTo({
            center: [cluster.lng, cluster.lat],
            zoom: targetZoom,
            duration: 650,
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    fitPlaces(map, places, showSelectedCard);
  }, [mapReady, places, showSelectedCard]);

  useEffect(() => {
    const map = mapRef.current;
    if (!autoFocusSelected || !map || !mapReady || !selected) return;
    map.easeTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 12.8), duration: 650 });
  }, [autoFocusSelected, mapReady, selected]);

  if (!accessToken && !requireMapbox) {
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
          showSelectedCard={showSelectedCard}
          className={className}
        />
        <div className="absolute left-5 top-5 z-30 max-w-sm rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_12px_30px_rgba(39,34,27,0.12)]">
          Add <span className="font-sans">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</span> to .env and restart the dev server to enable Mapbox.
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
      <div ref={containerRef} className="absolute inset-0" />
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
          />
        </div>
      ) : null}
    </section>
  );
}
