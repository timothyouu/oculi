"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MapboxMap } from "@/components/mapbox-map";
import { PlaceDetailPopup } from "@/components/place-detail-popup";
import { useDemoState } from "@/lib/demo-state";
import { buildSearchCorpus, getSearchCorrection, matchesCorrectedQuery } from "@/lib/search-corrections";
import { rankSearchResults } from "@/lib/search-ranking";
import { sortTopPlaces } from "@/lib/scoring";
import { accessibilityForPlace, accessibilityOptions } from "@/lib/place-accessibility";
import { clearMapSelectedPlaceId, loadMapSelectedPlaceId, saveMapSelectedPlaceId } from "@/lib/storage";
import {
  BookOpen,
  Building2,
  ChevronDown,
  CloudSun,
  Landmark,
  MapPin,
  Mountain,
  Navigation,
  Palette,
  Search,
  SlidersHorizontal,
  Users,
  Waves,
  X,
} from "lucide-react";
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

const lightOptions = ["Any", "Golden hour", "Sunrise", "Sunset", "Blue hour", "Daylight", "Night"];

const sceneOptions = [
  { label: "Landscape", value: "landscape", icon: Mountain },
  { label: "Cityscape", value: "skyline", icon: Building2 },
  { label: "Seascape", value: "coast", icon: Waves },
  { label: "Architecture", value: "architecture", icon: BookOpen },
  { label: "Portraits", value: "portraits", icon: Users },
  { label: "Street", value: "street", icon: MapPin },
  { label: "Bridge", value: "bridge", icon: Landmark },
  { label: "Color", value: "color", icon: Palette },
];

function normalizedText(parts: Array<string | string[] | undefined>) {
  return parts.flatMap((part) => (Array.isArray(part) ? part : part ? [part] : [])).join(" ").toLowerCase();
}

function placeSearchFields(place: Place, area?: { id?: string; name: string; region: string }, placePhotos: Photo[] = []) {
  return [
    place.name,
    place.fuzzyLocationLabel,
    place.navigationAddress,
    place.description,
    place.tags,
    place.bestTimes,
    area?.id,
    area?.name,
    area?.region,
    ...placePhotos.flatMap((photo) => [
      photo.caption,
      photo.locationLabel,
      photo.metadataText,
      photo.shotAtTimeOfDay,
      photo.tags,
    ]),
  ];
}

function isExactPlaceSearch(place: Place, correctedQuery: string) {
  if (!correctedQuery) return false;

  return [place.name, place.fuzzyLocationLabel, place.navigationAddress]
    .filter(Boolean)
    .some((field) => normalizedText([field]).replace(/[,]+/g, "") === correctedQuery);
}

function matchesLightFilter(lightFilter: string, place: Place, photo: Photo) {
  if (lightFilter === "Any") return true;
  const aliases = lightAliases[lightFilter] ?? [lightFilter.toLowerCase()];
  const text = normalizedText([place.bestTimes, photo.shotAtTimeOfDay, photo.tags]);

  return aliases.some((alias) => text.includes(alias));
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function MapPage() {
  const { areas, photos, places, state, toggleSavedPlace, recordPlaceView } = useDemoState();
  const topPlaces = useMemo(() => sortTopPlaces(places), [places]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(undefined);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lightFilter, setLightFilter] = useState("Any");
  const [sceneFilters, setSceneFilters] = useState<string[]>([]);
  const [accessibilityFilters, setAccessibilityFilters] = useState<string[]>([]);
  const [nearStatus, setNearStatus] = useState("");
  const popupHistoryRef = useRef(false);
  const placesById = useMemo(() => Object.fromEntries(topPlaces.map((place) => [place.id, place])), [topPlaces]);
  const areasById = useMemo(() => Object.fromEntries(areas.map((area) => [area.id, area])), [areas]);
  const photosByPlaceId = useMemo(
    () =>
      photos.reduce<Record<string, Photo[]>>((groups, photo) => {
        groups[photo.placeId] = [...(groups[photo.placeId] ?? []), photo];
        return groups;
      }, {}),
    [photos],
  );
  const searchCorpus = useMemo(
    () =>
      buildSearchCorpus([
        ...areas.map((area) => [area.name, area.region, area.description]),
        ...topPlaces.map((place) =>
          placeSearchFields(place, areasById[place.areaId], photosByPlaceId[place.id] ?? []),
        ),
        ...photos.map((photo) => [
          photo.caption,
          photo.locationLabel,
          photo.metadataText,
          photo.shotAtTimeOfDay,
          photo.tags,
        ]),
      ]),
    [areas, areasById, photos, photosByPlaceId, topPlaces],
  );
  const searchCorrection = useMemo(() => getSearchCorrection(query, searchCorpus), [query, searchCorpus]);
  const placeMatches = useMemo(() => {
    const matchingPlaces = topPlaces.filter((place) => {
      const placePhotos = photosByPlaceId[place.id] ?? [];
      const matchesQuery = matchesCorrectedQuery(
        placeSearchFields(place, areasById[place.areaId], placePhotos),
        searchCorrection,
      );
      const matchesLight =
        lightFilter === "Any" ||
        place.bestTimes.some((time) =>
          (lightAliases[lightFilter] ?? [lightFilter.toLowerCase()]).some((alias) =>
            normalizedText([time]).includes(alias),
          ),
        ) ||
        placePhotos.some((photo) => matchesLightFilter(lightFilter, place, photo));
      const matchesScene =
        !sceneFilters.length ||
        sceneFilters.some((filter) => normalizedText([place.tags, placePhotos.flatMap((photo) => photo.tags)]).includes(filter));
      const matchesAccessibility =
        !accessibilityFilters.length || accessibilityFilters.includes(accessibilityForPlace(place));

      return matchesQuery && matchesLight && matchesScene && matchesAccessibility;
    });

    if (!searchCorrection.correctedQuery) return matchingPlaces;

    return rankSearchResults({
      items: matchingPlaces,
      query: searchCorrection.correctedQuery,
      fields: [
        { weight: 6, getValue: (place) => [place.name] },
        { weight: 5, getValue: (place) => [areasById[place.areaId]?.id, areasById[place.areaId]?.name, areasById[place.areaId]?.region] },
        { weight: 4, getValue: (place) => [place.fuzzyLocationLabel, place.navigationAddress] },
        { weight: 3, getValue: (place) => [place.tags, place.bestTimes] },
        { weight: 2, getValue: (place) => [place.description] },
        {
          weight: 1,
          getValue: (place) =>
            (photosByPlaceId[place.id] ?? []).flatMap((photo) => [
              photo.caption,
              photo.locationLabel,
              photo.metadataText,
              photo.shotAtTimeOfDay,
              photo.tags,
            ]),
        },
      ],
    });
  }, [accessibilityFilters, areasById, lightFilter, photosByPlaceId, sceneFilters, searchCorrection, topPlaces]);
  const exactSearchPlace = useMemo(
    () => placeMatches.find((place) => isExactPlaceSearch(place, searchCorrection.correctedQuery)),
    [placeMatches, searchCorrection.correctedQuery],
  );
  const mapPlaces = placeMatches;
  const mapPlaceIds = useMemo(() => new Set(mapPlaces.map((place) => place.id)), [mapPlaces]);
  const filteredPhotos = photos.filter((photo) => {
    const place = placesById[photo.placeId];
    if (!place || !mapPlaceIds.has(place.id)) return false;

    const placePhotos = photosByPlaceId[place.id] ?? [];
    const matchesQuery =
      !searchCorrection.correctedQuery ||
      matchesCorrectedQuery(placeSearchFields(place, areasById[place.areaId], placePhotos), searchCorrection);
    const matchesLight = matchesLightFilter(lightFilter, place, photo) || lightFilter === "Any";
    const matchesScene =
      !sceneFilters.length || sceneFilters.some((filter) => normalizedText([place.tags, photo.tags]).includes(filter));
    const matchesAccessibility =
      !accessibilityFilters.length || accessibilityFilters.includes(accessibilityForPlace(place));

    return matchesQuery && matchesLight && matchesScene && matchesAccessibility;
  });
  const selectedIsVisible = mapPlaces.some((place) => place.id === selectedPlaceId);
  // No fallback to `mapPlaces[0]` here: the place card should stay hidden
  // until the visitor clicks a node (or a restored/searched selection kicks
  // in above), not default to showing a random first place.
  const visibleSelectedPlaceId = exactSearchPlace?.id ?? (selectedIsVisible ? selectedPlaceId : undefined);
  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (lightFilter !== "Any" ? 1 : 0) +
    sceneFilters.length +
    accessibilityFilters.length;
  const activeSceneOptions = sceneFilters
    .map((value) => sceneOptions.find((option) => option.value === value))
    .filter((option): option is (typeof sceneOptions)[number] => Boolean(option));
  const resultSummary = `${mapPlaces.length} place${mapPlaces.length === 1 ? "" : "s"} · ${filteredPhotos.length} photo${filteredPhotos.length === 1 ? "" : "s"}`;

  useEffect(() => {
    if (!exactSearchPlace || selectedPlaceId === exactSearchPlace.id) return;
    setSelectedPlaceId(exactSearchPlace.id);
    saveMapSelectedPlaceId(exactSearchPlace.id);
    recordPlaceView(exactSearchPlace.id);
  }, [exactSearchPlace, recordPlaceView, selectedPlaceId]);

  // Restore whichever place card the visitor last had open, so returning to
  // the map doesn't drop them back to a blank/default view. This only
  // applies if they left the card open — closing it (the X on the card)
  // clears the persisted id, so a fresh visit stays empty until a node is
  // clicked, per the "no title card until a node is clicked" behavior below.
  const hasRestoredSelectionRef = useRef(false);
  const [restoredFocusPending, setRestoredFocusPending] = useState(false);
  useEffect(() => {
    if (hasRestoredSelectionRef.current || !topPlaces.length) return;
    hasRestoredSelectionRef.current = true;

    const persistedPlaceId = loadMapSelectedPlaceId();
    if (persistedPlaceId && topPlaces.some((place) => place.id === persistedPlaceId)) {
      setSelectedPlaceId(persistedPlaceId);
      setRestoredFocusPending(true);
    }
  }, [topPlaces]);

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
    saveMapSelectedPlaceId(placeId);
    recordPlaceView(placeId);
  }

  function closeSelectedPlace() {
    setSelectedPlaceId(undefined);
    clearMapSelectedPlaceId();
  }

  function clearFilters() {
    setQuery("");
    setLightFilter("Any");
    setSceneFilters([]);
    setAccessibilityFilters([]);
    setNearStatus("");
  }

  const openPlace = useCallback((placeId: string) => {
    recordPlaceView(placeId);
    setSelectedPlaceId(placeId);
    saveMapSelectedPlaceId(placeId);
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
        <details className="group rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_14px_34px_rgba(39,34,27,0.08)] lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
            <span>
              <span className="block font-sans text-xs font-semibold uppercase tracking-[0.14em] text-[var(--moss)]">
                Map filters
              </span>
              <span className="text-base text-[var(--ink)]">
                {activeFilterCount ? `${activeFilterCount} active · ${resultSummary}` : resultSummary}
              </span>
            </span>
            <span className="grid size-10 place-items-center rounded-full bg-[var(--chip)] text-[var(--ink)]">
              <SlidersHorizontal className="size-5" />
            </span>
          </summary>
          <div className="space-y-4 border-t border-[var(--line)] p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--ink)]/60" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 w-full rounded-lg border border-[var(--line)] bg-white pl-12 pr-10 text-base outline-none"
                placeholder="Search city, scene, or mood"
                aria-label="Search map places"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <QuickFilterButton
                active={lightFilter === "Golden hour"}
                icon={<CloudSun className="size-4" />}
                label="Golden light"
                onClick={() => setLightFilter(lightFilter === "Golden hour" ? "Any" : "Golden hour")}
              />
              <QuickFilterButton
                active={sceneFilters.includes("skyline")}
                icon={<Building2 className="size-4" />}
                label="City views"
                onClick={() => toggleSceneFilter("skyline")}
              />
              <QuickFilterButton
                active={sceneFilters.includes("coast")}
                icon={<Waves className="size-4" />}
                label="Waterfront"
                onClick={() => toggleSceneFilter("coast")}
              />
              <QuickFilterButton
                active={accessibilityFilters.includes("Easy")}
                icon={<MapPin className="size-4" />}
                label="Easy access"
                onClick={() => toggleAccessibilityFilter("Easy")}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {["Any", "Golden hour", "Blue hour", "Night"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLightFilter(item)}
                  className={cx(
                    "rounded-lg border px-3 py-2.5 text-left font-sans text-sm transition",
                    lightFilter === item
                      ? "border-[var(--moss)] bg-[var(--moss)] text-white"
                      : "border-[var(--line)] bg-white text-[var(--ink)]",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                className={cx(
                  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border font-sans text-sm font-semibold transition",
                  nearStatus
                    ? "border-[var(--moss)] bg-[var(--chip)] text-[var(--moss-dark)]"
                    : "border-[var(--line)] bg-white text-[var(--ink)]",
                )}
                onClick={() => {
                  setNearStatus("Showing the closest seeded photo spots for this demo.");
                  const nearestPlaceId = mapPlaces[0]?.id ?? topPlaces[0]?.id;
                  if (nearestPlaceId) selectPlace(nearestPlaceId);
                }}
              >
                <Navigation className="size-4" /> Near me
              </button>
              {activeFilterCount ? (
                <button type="button" onClick={clearFilters} className="h-11 rounded-lg px-3 font-sans text-sm text-[var(--moss)]">
                  Clear all
                </button>
              ) : null}
            </div>
            {nearStatus ? <NearStatusNotice status={nearStatus} /> : null}
          </div>
        </details>

        <div className="grid min-h-[560px] overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_24px_70px_rgba(39,34,27,0.10)] lg:h-[calc(100vh-184px)] lg:min-h-[520px] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-[var(--line)] bg-[rgba(255,253,248,0.9)] px-5 py-6 lg:block">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-[var(--moss)]">
                  Explore
                </p>
                <h1 className="mt-1 text-2xl leading-tight text-[var(--ink)]">Find photo spots</h1>
              </div>
              <span className="rounded-full bg-[var(--chip)] px-3 py-1 font-sans text-sm text-[var(--muted)]">
                {resultSummary}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--ink)]/60" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 w-full rounded-lg border border-[var(--line)] bg-white pl-12 pr-10 text-base outline-none shadow-[0_8px_24px_rgba(39,34,27,0.05)]"
                placeholder="Search city, scene, or mood"
                aria-label="Search map places"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            {query.trim() && searchCorrection.wasCorrected ? (
              <p className="mt-3 px-1 text-sm text-[var(--muted)]" aria-live="polite">
                Auto-corrected to <span className="font-medium text-[var(--ink)]">{searchCorrection.correctedQuery}</span>
              </p>
            ) : null}

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-sans text-sm font-semibold text-[var(--ink)]">Start with</h2>
                {activeFilterCount ? (
                  <button type="button" onClick={clearFilters} className="font-sans text-sm text-[var(--moss)]">
                    Clear all
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <QuickFilterButton
                  active={lightFilter === "Golden hour"}
                  icon={<CloudSun className="size-4" />}
                  label="Golden light"
                  onClick={() => setLightFilter(lightFilter === "Golden hour" ? "Any" : "Golden hour")}
                />
                <QuickFilterButton
                  active={sceneFilters.includes("skyline")}
                  icon={<Building2 className="size-4" />}
                  label="City views"
                  onClick={() => toggleSceneFilter("skyline")}
                />
                <QuickFilterButton
                  active={sceneFilters.includes("coast")}
                  icon={<Waves className="size-4" />}
                  label="Waterfront"
                  onClick={() => toggleSceneFilter("coast")}
                />
                <QuickFilterButton
                  active={accessibilityFilters.includes("Easy")}
                  icon={<MapPin className="size-4" />}
                  label="Easy access"
                  onClick={() => toggleAccessibilityFilter("Easy")}
                />
              </div>
            </section>

            {activeFilterCount ? (
              <section className="mt-5 rounded-lg border border-[var(--line)] bg-white/76 p-3">
                <div className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <SlidersHorizontal className="size-4" />
                  Active filters
                </div>
                <div className="flex flex-wrap gap-2">
                  {query.trim() ? <ActiveFilterChip label={`Search: ${searchCorrection.correctedQuery}`} onClear={() => setQuery("")} /> : null}
                  {lightFilter !== "Any" ? <ActiveFilterChip label={lightFilter} onClear={() => setLightFilter("Any")} /> : null}
                  {activeSceneOptions.map((option) => (
                    <ActiveFilterChip key={option.value} label={option.label} onClear={() => toggleSceneFilter(option.value)} />
                  ))}
                  {accessibilityFilters.map((filter) => (
                    <ActiveFilterChip key={filter} label={filter} onClear={() => toggleAccessibilityFilter(filter)} />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-5 space-y-3">
              <FilterSection title="Best light" icon={<CloudSun className="size-4" />} defaultOpen>
                <div className="grid grid-cols-2 gap-2">
                  {lightOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLightFilter(item)}
                      className={cx(
                        "rounded-lg border px-3 py-2.5 text-left font-sans text-sm transition",
                        lightFilter === item
                          ? "border-[var(--moss)] bg-[var(--moss)] text-white"
                          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--moss)]/50",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Scene type" icon={<Mountain className="size-4" />}>
                <div className="grid grid-cols-2 gap-2">
                  {sceneOptions.map(({ label, value, icon: Icon }) => {
                    const checked = sceneFilters.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={cx(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left font-sans text-sm transition",
                          checked
                            ? "border-[var(--moss)] bg-[var(--moss)] text-white"
                            : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--moss)]/50",
                        )}
                        onClick={() => toggleSceneFilter(value)}
                        aria-pressed={checked}
                      >
                        <Icon className={cx("size-4", checked ? "text-white" : "text-[var(--muted)]")} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Ease of visit" icon={<MapPin className="size-4" />}>
                <div className="grid grid-cols-3 gap-2">
                  {accessibilityOptions.map((item) => {
                    const checked = accessibilityFilters.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={cx(
                          "rounded-lg border px-3 py-2.5 text-center font-sans text-sm transition",
                          checked
                            ? "border-[var(--moss)] bg-[var(--moss)] text-white"
                            : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--moss)]/50",
                        )}
                        onClick={() => toggleAccessibilityFilter(item)}
                        aria-pressed={checked}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            </div>

            {nearStatus ? <NearStatusNotice status={nearStatus} /> : null}
            <button
              className={cx(
                "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border font-sans text-sm font-semibold shadow-[0_8px_24px_rgba(39,34,27,0.05)] transition hover:border-[var(--moss)]/50",
                nearStatus
                  ? "border-[var(--moss)] bg-[var(--chip)] text-[var(--moss-dark)]"
                  : "border-[var(--line)] bg-white text-[var(--ink)]",
              )}
              onClick={() => {
                setNearStatus("Showing the closest seeded photo spots for this demo.");
                const nearestPlaceId = mapPlaces[0]?.id ?? topPlaces[0]?.id;
                if (nearestPlaceId) selectPlace(nearestPlaceId);
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
              onCloseSelected={closeSelectedPlace}
              showSelectedCard
              autoFocusSelected={Boolean(exactSearchPlace) || restoredFocusPending}
              className="h-full min-h-[560px] border-0 shadow-none lg:min-h-0"
            />
          </div>
        </div>
        <PlaceDetailPopup placeId={detailPlaceId} onClose={closePlace} onOpenPlace={openPlace} />
      </div>
    </AppShell>
  );
}

function NearStatusNotice({ status }: { status: string }) {
  return (
    <div
      className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2.5 text-center font-sans text-sm text-[var(--muted)]"
      aria-live="polite"
    >
      <Navigation className="size-4 shrink-0 text-[var(--moss)]" aria-hidden="true" />
      <span>{status}</span>
    </div>
  );
}

function QuickFilterButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "flex min-h-12 items-center gap-2 rounded-lg border px-3 text-left font-sans text-sm transition",
        active
          ? "border-[var(--moss)] bg-[var(--moss)] text-white"
          : "border-[var(--line)] bg-white text-[var(--ink)] shadow-[0_8px_24px_rgba(39,34,27,0.04)] hover:border-[var(--moss)]/50",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ActiveFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--chip)] py-1 pl-3 pr-1 font-sans text-sm text-[var(--ink)]">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="grid size-6 place-items-center rounded-full text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"
        aria-label={`Remove ${label} filter`}
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

function FilterSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group rounded-lg border border-[var(--line)] bg-white/68" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base text-[var(--ink)] marker:hidden">
        <span className="flex items-center gap-2">
          {icon ? <span className="text-[var(--muted)]">{icon}</span> : null}
          {title}
        </span>
        <ChevronDown className="size-4 text-[var(--muted)] transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--line)] p-3">{children}</div>
    </details>
  );
}
