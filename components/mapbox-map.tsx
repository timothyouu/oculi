"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Bookmark, Send } from "lucide-react";
import type { Map as MapboxMapInstance, Marker } from "mapbox-gl";
import type { Photo, Place } from "@/lib/types";
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

type SelectionTether = {
  markerX: number;
  markerY: number;
  cardX: number;
  cardY: number;
  visible: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fitPlaces(map: MapboxMapInstance, places: Place[]) {
  if (!places.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  places.forEach((place) => bounds.extend([place.lng, place.lat]));

  if (places.length === 1) {
    map.easeTo({ center: [places[0].lng, places[0].lat], zoom: 13.5, duration: 650 });
    return;
  }

  map.fitBounds(bounds, {
    padding: { top: 90, right: 420, bottom: 90, left: 90 },
    maxZoom: 13.2,
    duration: 800,
  });
}

function visiblePlaceLimitForZoom(zoom: number) {
  if (zoom < 10.8) return 5;
  if (zoom < 12) return 8;
  if (zoom < 13.2) return 12;
  return Number.POSITIVE_INFINITY;
}

function nodeScore(place: Place, photoCount: number) {
  return photoCount * 100_000 + place.saveCount * 100 + place.recentActivityScore + (place.timCurated ? 10_000 : 0);
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
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapZoom, setMapZoom] = useState(11.1);
  const [selectionTether, setSelectionTether] = useState<SelectionTether | null>(null);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const selected = places.find((place) => place.id === selectedPlaceId) || places[0];
  const placeNodes = useMemo(() => {
    const photoCounts = photos.reduce<Record<string, number>>((counts, photo) => {
      counts[photo.placeId] = (counts[photo.placeId] ?? 0) + 1;
      return counts;
    }, {});

    return places
      .map((place) => ({
        place,
        photoCount: photoCounts[place.id] ?? 0,
        score: nodeScore(place, photoCounts[place.id] ?? 0),
      }))
      .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
  }, [photos, places]);
  const visiblePlaceNodes = useMemo(
    () => placeNodes.slice(0, visiblePlaceLimitForZoom(mapZoom)),
    [mapZoom, placeNodes],
  );

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

    updateZoom();
    map.on("zoom", updateZoom);

    return () => {
      map.off("zoom", updateZoom);
    };
  }, [mapReady]);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    const allowedOrigin = window.location.origin;
    const tileHealthCheckUrl = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2,mapbox.mapbox-bathymetry-v2/11/327/791.vector.pbf?access_token=${accessToken}`;

    fetch(tileHealthCheckUrl, { signal: controller.signal })
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
    markersRef.current = visiblePlaceNodes.map(({ place, photoCount }, index) => {
      const markerButton = document.createElement("button");
      const isSelected = place.id === selected?.id;
      const isSaved = savedPlaceIds.includes(place.id);
      const countLabel = document.createElement("span");
      const rankLabel = document.createElement("span");

      markerButton.type = "button";
      markerButton.setAttribute("aria-label", `Select ${place.name}, ${photoCount} photo${photoCount === 1 ? "" : "s"}`);
      markerButton.title = `${place.name} · ${photoCount} photo${photoCount === 1 ? "" : "s"}`;
      markerButton.className = cx(
        "flex h-11 min-w-12 items-center justify-center gap-1.5 rounded-full border-2 border-white px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(29,29,27,0.28)] transition hover:scale-105",
        isSelected ? "scale-110 bg-[var(--gold)]" : isSaved ? "bg-[var(--moss)]" : "bg-[var(--moss-dark)]",
      );
      countLabel.textContent = String(photoCount);
      countLabel.className = "text-base leading-none";
      rankLabel.textContent = `#${index + 1}`;
      rankLabel.className = "text-[10px] leading-none opacity-80";
      markerButton.append(countLabel, rankLabel);
      markerButton.addEventListener("click", () => onSelectPlace?.(place.id));

      return new mapboxgl.Marker({ element: markerButton, anchor: "center" }).setLngLat([place.lng, place.lat]).addTo(map);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [mapReady, onSelectPlace, savedPlaceIds, selected?.id, visiblePlaceNodes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    fitPlaces(map, places);
  }, [mapReady, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!autoFocusSelected || !map || !mapReady || !selected) return;
    map.easeTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 12.8), duration: 650 });
  }, [autoFocusSelected, mapReady, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selected) {
      setSelectionTether(null);
      return;
    }

    let animationFrame = 0;

    const updateTether = () => {
      animationFrame = 0;

      if (!containerRef.current || !selectedCardRef.current) {
        setSelectionTether(null);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const cardRect = selectedCardRef.current.getBoundingClientRect();
      const markerPoint = map.project([selected.lng, selected.lat]);
      const cardLeft = cardRect.left - containerRect.left;
      const cardRight = cardRect.right - containerRect.left;
      const cardTop = cardRect.top - containerRect.top;
      const cardBottom = cardRect.bottom - containerRect.top;
      const nextTether = {
        markerX: Math.round(markerPoint.x),
        markerY: Math.round(markerPoint.y),
        cardX: Math.round(clamp(markerPoint.x, cardLeft, cardRight)),
        cardY: Math.round(clamp(markerPoint.y, cardTop, cardBottom)),
        visible:
          markerPoint.x >= -40 &&
          markerPoint.x <= containerRect.width + 40 &&
          markerPoint.y >= -40 &&
          markerPoint.y <= containerRect.height + 40,
      };

      setSelectionTether((current) => {
        if (
          current &&
          current.markerX === nextTether.markerX &&
          current.markerY === nextTether.markerY &&
          current.cardX === nextTether.cardX &&
          current.cardY === nextTether.cardY &&
          current.visible === nextTether.visible
        ) {
          return current;
        }

        return nextTether;
      });
    };

    const scheduleTetherUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateTether);
    };

    scheduleTetherUpdate();
    map.on("render", scheduleTetherUpdate);
    map.on("resize", scheduleTetherUpdate);
    window.addEventListener("resize", scheduleTetherUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      map.off("render", scheduleTetherUpdate);
      map.off("resize", scheduleTetherUpdate);
      window.removeEventListener("resize", scheduleTetherUpdate);
    };
  }, [mapReady, selected]);

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
        <div className="absolute left-5 top-5 z-30 max-w-md rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_12px_30px_rgba(39,34,27,0.12)]">
          {mapError}
        </div>
      ) : null}

      {showSelectedCard && selectionTether?.visible ? (
        <svg className="pointer-events-none absolute inset-0 z-10 size-full" aria-hidden="true">
          <line
            x1={selectionTether.markerX}
            y1={selectionTether.markerY}
            x2={selectionTether.cardX}
            y2={selectionTether.cardY}
            stroke="rgba(29,29,27,0.34)"
            strokeWidth="2"
            strokeDasharray="7 7"
          />
        </svg>
      ) : null}

      {showSelectedCard && selected ? (
        <div ref={selectedCardRef} className="absolute bottom-8 right-8 z-20 w-[340px] overflow-hidden rounded-[22px] border border-white/60 bg-[var(--paper-strong)] shadow-[0_18px_50px_rgba(39,34,27,0.18)] max-md:inset-x-4 max-md:bottom-4 max-md:w-auto">
          <img src={selected.coverPhotoUrl} alt="" className="aspect-[16/9] w-full object-cover" />
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-2xl font-semibold text-[var(--ink)]">{selected.name}</h3>
                <p className="truncate text-base text-[var(--muted)]">{selected.fuzzyLocationLabel}</p>
              </div>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-b-lg bg-[var(--gold)] text-white"
                aria-label={savedPlaceIds.includes(selected.id) ? `Unsave ${selected.name}` : `Save ${selected.name}`}
                onClick={() => onToggleSaved?.(selected.id)}
              >
                <Bookmark className={cx("size-5", savedPlaceIds.includes(selected.id) && "fill-current")} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--ink)]">
                  {tag}
                </span>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
              <Bookmark className="size-4" aria-hidden="true" />
              {selected.saveCount} saves
            </p>
            <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-3">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--moss)] text-base text-white"
                onClick={() => onOpenPlace?.(selected.id)}
              >
                Open place
              </button>
              <button type="button" className="grid size-12 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]">
                <Send className="size-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
