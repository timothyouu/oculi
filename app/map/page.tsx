"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { MapboxMap } from "@/components/mapbox-map";
import { PlaceDetailPopup } from "@/components/place-detail-popup";
import { useDemoState } from "@/lib/demo-state";
import { buildSearchCorpus, getSearchCorrection, matchesCorrectedQuery } from "@/lib/search-corrections";
import { sortTopPlaces } from "@/lib/scoring";
import { BookOpen, Building2, CloudSun, Landmark, MapPin, Mountain, Navigation, Palette, Users, Waves } from "lucide-react";
import type { ReactNode } from "react";
import type { Photo, Place } from "@/lib/types";

const lightAliases: Record<string, string[]> = {
  Any: [],
  "Golden hour": ["golden hour", "sunrise", "sunset", "late afternoon"],
  Sunrise: ["sunrise", "morning"],
  Sunset: ["sunset", "late afternoon"],
  "Blue hour": ["blue hour", "night"],
  Daylight: ["daylight", "morning", "afternoon", "clear", "overcast", "low tide"],
  Night: ["night"],
};

function normalizedText(parts: Array<string | string[] | undefined>) {
  return parts.flatMap((part) => (Array.isArray(part) ? part : part ? [part] : [])).join(" ").toLowerCase();
}

function accessibilityForPlace(place: Place) {
  const text = normalizedText([place.tags, place.bestTimes, place.description]);

  if (["trail", "ruins", "long exposure", "night", "low tide"].some((term) => text.includes(term))) {
    return "Difficult";
  }

  if (["coast", "overlook", "skyline", "bridge", "waterfront", "beach"].some((term) => text.includes(term))) {
    return "Moderate";
  }

  return "Easy";
}

function matchesLightFilter(lightFilter: string, place: Place, photo: Photo) {
  if (lightFilter === "Any") return true;
  const aliases = lightAliases[lightFilter] ?? [lightFilter.toLowerCase()];
  const text = normalizedText([place.bestTimes, photo.shotAtTimeOfDay, photo.tags]);

  return aliases.some((alias) => text.includes(alias));
}

export default function MapPage() {
  const { photos, places, state, toggleSavedPlace, recordPlaceView } = useDemoState();
  const topPlaces = useMemo(() => sortTopPlaces(places), [places]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(topPlaces[0]?.id);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lightFilter, setLightFilter] = useState("Any");
  const [sceneFilters, setSceneFilters] = useState(["landscape", "portraits"]);
  const [accessibilityFilters, setAccessibilityFilters] = useState<string[]>([]);
  const [nearStatus, setNearStatus] = useState("");
  const popupHistoryRef = useRef(false);
  const placesById = useMemo(() => Object.fromEntries(topPlaces.map((place) => [place.id, place])), [topPlaces]);
  const searchCorpus = useMemo(
    () =>
      buildSearchCorpus([
        ...topPlaces.map((place) => [place.name, place.fuzzyLocationLabel, place.description, place.tags, place.bestTimes]),
        ...photos.map((photo) => [
          photo.caption,
          photo.locationLabel,
          photo.metadataText,
          photo.shotAtTimeOfDay,
          photo.tags,
        ]),
      ]),
    [photos, topPlaces],
  );
  const searchCorrection = useMemo(() => getSearchCorrection(query, searchCorpus), [query, searchCorpus]);
  const filteredPhotos = photos.filter((photo) => {
    const place = placesById[photo.placeId];
    if (!place) return false;

    const matchesQuery = matchesCorrectedQuery([
      place.name,
      place.fuzzyLocationLabel,
      place.description,
      place.tags,
      photo.caption,
      photo.locationLabel,
      photo.metadataText,
      photo.shotAtTimeOfDay,
      photo.tags,
    ], searchCorrection);
    const matchesLight = matchesLightFilter(lightFilter, place, photo);
    const matchesScene =
      !sceneFilters.length || sceneFilters.some((filter) => normalizedText([place.tags, photo.tags]).includes(filter));
    const matchesAccessibility =
      !accessibilityFilters.length || accessibilityFilters.includes(accessibilityForPlace(place));

    return matchesQuery && matchesLight && matchesScene && matchesAccessibility;
  });
  const filteredPhotoPlaceIds = new Set(filteredPhotos.map((photo) => photo.placeId));
  const mapPlaces = topPlaces.filter((place) => filteredPhotoPlaceIds.has(place.id));
  const selectedIsVisible = mapPlaces.some((place) => place.id === selectedPlaceId);
  const visibleSelectedPlaceId = selectedIsVisible ? selectedPlaceId : mapPlaces[0]?.id;

  function toggleSceneFilter(filter: string) {
    setSceneFilters((filters) =>
      filters.includes(filter) ? filters.filter((item) => item !== filter) : [...filters, filter],
    );
  }

  function toggleAccessibilityFilter(filter: string) {
    setAccessibilityFilters((filters) =>
      filters.includes(filter) ? filters.filter((item) => item !== filter) : [...filters, filter],
    );
  }

  function selectPlace(placeId: string) {
    setSelectedPlaceId(placeId);
    recordPlaceView(placeId);
  }

  const openPlace = useCallback((placeId: string) => {
    recordPlaceView(placeId);
    setSelectedPlaceId(placeId);
    setDetailPlaceId(placeId);

    if (!popupHistoryRef.current) {
      window.history.pushState({ ...window.history.state, oculiPlacePopup: true }, "", window.location.href);
      popupHistoryRef.current = true;
    }
  }, [recordPlaceView]);

  const closePlace = useCallback(() => {
    if (popupHistoryRef.current) {
      window.history.back();
      return;
    }

    setDetailPlaceId(null);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (!popupHistoryRef.current) return;
      popupHistoryRef.current = false;
      setDetailPlaceId(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <AppShell activeItem="map">
      <div className="space-y-5">
        <BackButton label="Back" fallbackHref="/" />
        <div className="grid min-h-[560px] overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_24px_70px_rgba(39,34,27,0.10)] lg:h-[calc(100vh-184px)] lg:min-h-[520px] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-[var(--line)] bg-[rgba(255,253,248,0.82)] p-7 lg:block">
            <div className="relative mb-7">
              <MapPin className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--ink)]/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 w-full rounded-lg border border-[var(--line)] bg-white pl-12 pr-4 text-base outline-none"
                placeholder="Search map"
                aria-label="Search map places"
              />
            </div>
            {query.trim() && searchCorrection.wasCorrected ? (
              <p className="-mt-5 mb-5 px-1 text-sm text-[var(--muted)]" aria-live="polite">
                Auto-corrected to <span className="font-medium text-[var(--ink)]">{searchCorrection.correctedQuery}</span>
              </p>
            ) : null}
            <FilterSection title="Best light" icon={<CloudSun className="size-5" />}>
              {["Any", "Golden hour", "Sunrise", "Sunset", "Blue hour", "Daylight", "Night"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLightFilter(item)}
                  className={`rounded-lg border border-[var(--line)] px-4 py-3 text-sm ${lightFilter === item ? "bg-[var(--moss)] text-white" : "bg-white text-[var(--ink)]"}`}
                >
                  {item}
                </button>
              ))}
            </FilterSection>
            <FilterSection title="Scene type">
              {[
                ["Landscape", "landscape", Mountain],
                ["Cityscape", "skyline", Building2],
                ["Seascape", "coast", Waves],
                ["Architecture", "architecture", BookOpen],
                ["Portraits", "portraits", Users],
                ["Street", "street", MapPin],
                ["Bridge", "bridge", Landmark],
                ["Color", "color", Palette],
              ].map(([label, value, Icon]) => {
                const TypedIcon = Icon as typeof MapPin;
                const checked = sceneFilters.includes(value as string);
                return (
                  <button key={label as string} type="button" className="flex w-full items-center justify-between py-2 text-base" onClick={() => toggleSceneFilter(value as string)}>
                    <span className="flex items-center gap-3"><TypedIcon className="size-5 text-[var(--muted)]" />{label as string}</span>
                    <span className={`grid size-5 place-items-center rounded border ${checked ? "border-[var(--moss)] bg-[var(--moss)]" : "border-[var(--muted)]"}`}>
                      {checked ? <span className="size-2 rounded-full bg-white" /> : null}
                    </span>
                  </button>
                );
              })}
            </FilterSection>
            <FilterSection title="Accessibility">
              {["Easy", "Moderate", "Difficult"].map((item) => {
                const checked = accessibilityFilters.includes(item);
                return (
                  <button key={item} type="button" className="flex w-full items-center gap-3 py-2 text-base" onClick={() => toggleAccessibilityFilter(item)}>
                    <span className={`grid size-5 place-items-center rounded border ${checked ? "border-[var(--moss)] bg-[var(--moss)]" : "border-[var(--muted)]"}`}>
                      {checked ? <span className="size-2 rounded-full bg-white" /> : null}
                    </span>
                    {item}
                  </button>
                );
              })}
            </FilterSection>
            <p className="text-sm text-[var(--muted)]">
              Showing {filteredPhotos.length} photo{filteredPhotos.length === 1 ? "" : "s"} across {mapPlaces.length} place{mapPlaces.length === 1 ? "" : "s"}.
            </p>
            {nearStatus ? <p className="mb-3 text-sm text-[var(--moss)]">{nearStatus}</p> : null}
            <button
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white text-base"
              onClick={() => {
                setNearStatus("Showing the closest seeded photo spots for this demo.");
                setSelectedPlaceId(mapPlaces[0]?.id ?? topPlaces[0]?.id);
              }}
            >
              <Navigation className="size-5" /> Near me
            </button>
          </aside>
          <div className="min-h-0 min-w-0 overflow-hidden">
            <MapboxMap
              places={mapPlaces}
              photos={filteredPhotos}
              selectedPlaceId={visibleSelectedPlaceId}
              savedPlaceIds={state.savedPlaceIds}
              onSelectPlace={selectPlace}
              onToggleSaved={toggleSavedPlace}
              onOpenPlace={openPlace}
              showSelectedCard
              autoFocusSelected={false}
              className="h-full min-h-[560px] border-0 shadow-none lg:min-h-0"
            />
          </div>
        </div>
        <PlaceDetailPopup placeId={detailPlaceId} onClose={closePlace} onOpenPlace={openPlace} />
      </div>
    </AppShell>
  );
}

function FilterSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 flex items-center justify-between text-lg text-[var(--ink)]">
        {title}
        {icon ? <span className="text-[var(--muted)]">{icon}</span> : null}
      </h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
