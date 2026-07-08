"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  ChevronRight,
  Clock3,
  CloudSun,
  Copy,
  ExternalLink,
  Grid2X2,
  Map,
  MapPinned,
  Mountain,
  Navigation,
  PencilLine,
  Pin,
  PinOff,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { MapboxMap } from "@/components/mapbox-map";
import { useDemoState } from "@/lib/demo-state";
import { formatPlaceLocation } from "@/lib/location-labels";
import type { Photo, Place } from "../lib/types";
import { saveRemoteRoutePlan } from "../lib/remote-route-plans";
import {
  buildSavedRoutePlans,
  createShootRouteStop,
  rebuildShootRoutePlan,
  type ShootRouteKind,
  type ShootRoutePlan,
  type ShootRouteStop,
} from "../lib/saved-route-planner";

type SavedPanelProps = {
  savedPlaces: Place[];
  savedPhotos?: Photo[];
  onOpenPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SavedPanel({
  savedPlaces,
  savedPhotos = [],
  onOpenPlace,
  onToggleSaved,
}: SavedPanelProps) {
  const { areas } = useDemoState();
  const [query, setQuery] = useState("");
  const [lightFilter, setLightFilter] = useState("All");
  const [sceneFilter, setSceneFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<ShootRouteKind>("morning");
  const [routeStatus, setRouteStatus] = useState("");
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [editedStopsByRoute, setEditedStopsByRoute] = useState<Partial<Record<ShootRouteKind, ShootRouteStop[]>>>({});
  const [pinnedStopIdsByRoute, setPinnedStopIdsByRoute] = useState<Record<ShootRouteKind, string[]>>({
    morning: [],
    sunset: [],
  });
  const hasActiveFilters = lightFilter !== "All" || sceneFilter !== "All";

  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return savedPlaces.filter((place) => {
      const matchesQuery =
        !normalized ||
        [place.name, place.fuzzyLocationLabel, place.description, ...place.tags].join(" ").toLowerCase().includes(normalized);
      const matchesLight = lightFilter === "All" || place.bestTimes.some((time) => time.toLowerCase().includes(lightFilter.toLowerCase()));
      const matchesScene = sceneFilter === "All" || place.tags.some((tag) => tag.toLowerCase().includes(sceneFilter.toLowerCase()));
      return matchesQuery && matchesLight && matchesScene;
    });
  }, [lightFilter, query, savedPlaces, sceneFilter]);

  const visiblePlaces = showAll ? filteredPlaces : filteredPlaces.slice(0, 6);
  const generatedRoutePlans = useMemo(() => buildSavedRoutePlans(filteredPlaces.length ? filteredPlaces : savedPlaces, savedPhotos), [filteredPlaces, savedPhotos, savedPlaces]);
  const routePlans = useMemo(
    () =>
      generatedRoutePlans.map((plan) =>
        editedStopsByRoute[plan.id] ? rebuildShootRoutePlan(plan.id, editedStopsByRoute[plan.id] ?? []) : plan,
      ),
    [editedStopsByRoute, generatedRoutePlans],
  );
  const activeRoute = routePlans.find((plan) => plan.id === activeRouteId) ?? routePlans[0];
  const activeGeneratedRoute = generatedRoutePlans.find((plan) => plan.id === activeRouteId) ?? generatedRoutePlans[0];
  const routePlaces = useMemo(() => {
    const seen = new Set<string>();
    const plannedPlaces: Place[] = [];

    routePlans.forEach((plan) => {
      plan.stops.forEach((stop) => {
        if (seen.has(stop.place.id)) return;
        seen.add(stop.place.id);
        plannedPlaces.push(stop.place);
      });
    });

    return plannedPlaces.length ? plannedPlaces : savedPlaces.slice(0, 5);
  }, [routePlans, savedPlaces]);

  const savedPhotosByPlace = useMemo(
    () =>
      savedPhotos.reduce<Record<string, Photo[]>>((groups, photo) => {
        groups[photo.placeId] = [...(groups[photo.placeId] ?? []), photo];
        return groups;
      }, {}),
    [savedPhotos],
  );

  function updateActiveRouteStops(updater: (stops: ShootRouteStop[]) => ShootRouteStop[]) {
    setEditedStopsByRoute((prev) => {
      const currentStops = prev[activeRouteId] ?? activeRoute.stops;
      return {
        ...prev,
        [activeRouteId]: updater(currentStops),
      };
    });
  }

  function addStop(placeId: string) {
    const place = savedPlaces.find((item) => item.id === placeId);
    if (!place) return;

    updateActiveRouteStops((stops) => {
      if (stops.some((stop) => stop.place.id === place.id)) return stops;
      const nextStop = createShootRouteStop(activeRouteId, place, savedPhotosByPlace[place.id] ?? [], stops.length);
      return [...stops, nextStop];
    });
    setIsEditingRoute(true);
    setRouteStatus(`Added ${place.name} to ${activeRoute.title}.`);
  }

  function removeStop(placeId: string) {
    updateActiveRouteStops((stops) => stops.filter((stop) => stop.place.id !== placeId));
    setPinnedStopIdsByRoute((prev) => ({
      ...prev,
      [activeRouteId]: prev[activeRouteId].filter((id) => id !== placeId),
    }));
    setRouteStatus("Removed stop from this route.");
  }

  function moveStop(placeId: string, direction: -1 | 1) {
    updateActiveRouteStops((stops) => {
      const index = stops.findIndex((stop) => stop.place.id === placeId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= stops.length) return stops;
      const nextStops = [...stops];
      const [movedStop] = nextStops.splice(index, 1);
      nextStops.splice(nextIndex, 0, movedStop);
      return nextStops;
    });
    setRouteStatus("Reordered route stops.");
  }

  function togglePinnedStop(placeId: string) {
    setPinnedStopIdsByRoute((prev) => {
      const current = prev[activeRouteId];
      const next = current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId];
      return { ...prev, [activeRouteId]: next };
    });
    setIsEditingRoute(true);
    setRouteStatus("Updated pinned stops for this route.");
  }

  function regenerateActiveRoute() {
    const pinnedIds = pinnedStopIdsByRoute[activeRouteId];
    const pinnedStops = pinnedIds
      .map((placeId) => activeRoute.stops.find((stop) => stop.place.id === placeId) ?? activeGeneratedRoute.stops.find((stop) => stop.place.id === placeId))
      .filter((stop): stop is ShootRouteStop => Boolean(stop));
    const generatedStops = activeGeneratedRoute.stops.filter((stop) => !pinnedIds.includes(stop.place.id));

    setEditedStopsByRoute((prev) => ({
      ...prev,
      [activeRouteId]: [...pinnedStops, ...generatedStops].slice(0, activeRouteId === "morning" ? 3 : 2),
    }));
    setRouteStatus(pinnedStops.length ? "Regenerated route while keeping pinned stops first." : "Regenerated route from current saved places.");
  }

  async function saveActiveRoutePlan() {
    if (!activeRoute.stops.length) {
      setRouteStatus("Add at least one stop before saving this route.");
      return;
    }

    try {
      const routePlanId = await saveRemoteRoutePlan({
        kind: activeRoute.id,
        name: `${activeRoute.title} - ${new Date().toLocaleDateString()}`,
        stops: activeRoute.stops.map((stop, index) => ({
          placeId: stop.place.id,
          position: index,
          arrivalLabel: stop.arrivalLabel,
          customNote: stop.note,
        })),
      });

      setRouteStatus(routePlanId ? `Saved ${activeRoute.title} plan.` : "Route plan ready locally. Connect Supabase to persist it remotely.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown route-plan save error.";
      setRouteStatus(`Could not save route plan: ${message}`);
    }
  }

  async function copyAddress(stop: ShootRouteStop) {
    const value = `${stop.place.name}\n${stop.address}\n${stop.coordinateLabel}`;

    try {
      await navigator.clipboard.writeText(value);
      setRouteStatus(`Copied ${stop.place.name} address.`);
    } catch {
      setRouteStatus(`${stop.place.name}: ${stop.address}`);
    }
  }

  return (
    <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--ink)] 2xl:text-5xl">
            Saved places <span className="ml-2 inline-block whitespace-nowrap align-middle text-base font-normal text-[var(--muted)]">{savedPlaces.length} saved</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block max-sm:w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--ink)]/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-48 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] pl-12 pr-4 outline-none 2xl:w-56 max-sm:w-full"
                placeholder="Search saved"
                aria-label="Search saved places"
              />
            </label>
            <button className="inline-flex h-12 items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4">
              Recently saved <ChevronRight className="size-4 rotate-90" />
            </button>
            <button className="grid size-12 place-items-center rounded-lg border border-[var(--line)] bg-[var(--paper-strong)]" aria-label="Grid view">
              <Grid2X2 className="size-5" />
            </button>
          </div>
        </div>
        <FilterToolbar
          lightFilter={lightFilter}
          sceneFilter={sceneFilter}
          hasActiveFilters={hasActiveFilters}
          onLightChange={setLightFilter}
          onSceneChange={setSceneFilter}
          onClear={() => {
            setLightFilter("All");
            setSceneFilter("All");
          }}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePlaces.map((place) => (
            <article key={place.id} className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_16px_42px_rgba(39,34,27,0.08)]">
              <button type="button" className="relative block w-full text-left" onClick={() => onOpenPlace?.(place.id)}>
                <img src={place.coverPhotoUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                <span className="absolute right-3 top-3 grid h-10 w-7 place-items-center rounded-b bg-[var(--gold)] text-white">
                  <Bookmark className="size-4 fill-current" />
                </span>
              </button>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => onOpenPlace?.(place.id)}>
                    <h2 className="truncate text-xl font-semibold text-[var(--ink)]">{place.name}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{formatPlaceLocation(place, areas)}</p>
                  </button>
                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-md text-[var(--gold)] hover:bg-[var(--chip)]"
                    onClick={() => onToggleSaved?.(place.id)}
                    aria-label={`Remove ${place.name} from saved places`}
                  >
                    <Bookmark className="size-5 fill-current" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {place.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-md bg-[var(--chip)] px-3 py-1.5 text-xs text-[var(--ink)]/80">{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!savedPlaces.length ? (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--paper-strong)] p-8 text-center text-[var(--muted)]">
            No bookmarked places yet. Swipe right or tap a ribbon to build a shoot list.
          </div>
        ) : null}
        {savedPlaces.length && !filteredPlaces.length ? (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--paper-strong)] p-8 text-center text-[var(--muted)]">
            No saved places match those filters. The planner is still using your full saved list.
          </div>
        ) : null}
        <div className="flex flex-wrap justify-center gap-5 text-[var(--muted)]">
          <span>Showing {visiblePlaces.length} of {filteredPlaces.length} saved places</span>
          {filteredPlaces.length > 6 ? (
            <button className="rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-8 py-3 text-[var(--ink)]" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Show less" : "Load more"}
            </button>
          ) : null}
        </div>
      </div>
      <ShootPlanner
        routePlans={routePlans}
        activeRoute={activeRoute}
        activeRouteId={activeRouteId}
        routePlaces={routePlaces}
        savedPhotos={savedPhotos}
        savedPlaces={savedPlaces}
        routeStatus={routeStatus}
        isEditingRoute={isEditingRoute}
        pinnedStopIds={pinnedStopIdsByRoute[activeRouteId]}
        onSetActiveRoute={setActiveRouteId}
        onToggleEditing={() => setIsEditingRoute((value) => !value)}
        onOpenPlace={onOpenPlace}
        onToggleSaved={onToggleSaved}
        onCopyAddress={copyAddress}
        onAddStop={addStop}
        onRemoveStop={removeStop}
        onMoveStop={moveStop}
        onTogglePinnedStop={togglePinnedStop}
        onRegenerateRoute={regenerateActiveRoute}
        onSaveRoutePlan={saveActiveRoutePlan}
      />
    </section>
  );
}

function ShootPlanner({
  routePlans,
  activeRoute,
  activeRouteId,
  routePlaces,
  savedPhotos,
  savedPlaces,
  routeStatus,
  isEditingRoute,
  pinnedStopIds,
  onSetActiveRoute,
  onToggleEditing,
  onOpenPlace,
  onToggleSaved,
  onCopyAddress,
  onAddStop,
  onRemoveStop,
  onMoveStop,
  onTogglePinnedStop,
  onRegenerateRoute,
  onSaveRoutePlan,
}: {
  routePlans: ShootRoutePlan[];
  activeRoute: ShootRoutePlan;
  activeRouteId: ShootRouteKind;
  routePlaces: Place[];
  savedPhotos: Photo[];
  savedPlaces: Place[];
  routeStatus: string;
  isEditingRoute: boolean;
  pinnedStopIds: string[];
  onSetActiveRoute: (routeId: ShootRouteKind) => void;
  onToggleEditing: () => void;
  onOpenPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
  onCopyAddress: (stop: ShootRouteStop) => void;
  onAddStop: (placeId: string) => void;
  onRemoveStop: (placeId: string) => void;
  onMoveStop: (placeId: string, direction: -1 | 1) => void;
  onTogglePinnedStop: (placeId: string) => void;
  onRegenerateRoute: () => void;
  onSaveRoutePlan: () => void;
}) {
  const previewPlaces = activeRoute.stops.length ? activeRoute.stops.map((stop) => stop.place) : routePlaces;
  const addablePlaces = savedPlaces.filter((place) => !activeRoute.stops.some((stop) => stop.place.id === place.id));

  return (
    <aside className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_16px_42px_rgba(39,34,27,0.08)] xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div>
          <p className="mb-1 text-sm text-[var(--muted)]">Saved itinerary</p>
          <h2 className="text-2xl font-semibold">Plan a shoot day</h2>
        </div>
        <button
          type="button"
          className={cx(
            "grid size-10 place-items-center rounded-lg border border-[var(--line)] text-[var(--ink)] shadow-sm transition hover:bg-[var(--chip)]",
            isEditingRoute ? "bg-[var(--chip)] text-[var(--moss)]" : "bg-white",
          )}
          onClick={onToggleEditing}
          aria-label="Edit stops"
        >
          <PencilLine className="size-5" />
        </button>
      </div>

      <div className="px-4">
        <MapboxMap
          places={previewPlaces}
          photos={savedPhotos}
          selectedPlaceId={activeRoute.stops[0]?.place.id}
          onSelectPlace={onOpenPlace}
          onToggleSaved={onToggleSaved}
          onOpenPlace={onOpenPlace}
          showSelectedCard={false}
          autoFocusSelected={false}
          requireMapbox={false}
          className="h-56 rounded-[10px] border border-[var(--line)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 px-6 py-5">
        {routePlans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSetActiveRoute(plan.id)}
            className={cx(
              "rounded-lg border border-[var(--line)] px-3 py-3 text-left shadow-sm transition",
              activeRouteId === plan.id ? "bg-[var(--moss)] text-white" : "bg-white text-[var(--ink)] hover:bg-[var(--chip)]",
            )}
          >
            <span className="flex items-center gap-2 text-sm">
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-md",
                  activeRouteId === plan.id ? "bg-white/15" : "bg-[var(--chip)] text-[var(--moss)]",
                )}
              >
                {plan.id === "morning" ? <Sun className="size-4" /> : <CloudSun className="size-4" />}
              </span>
              {plan.eyebrow}
            </span>
            <strong className="mt-2 block font-normal">{plan.title}</strong>
          </button>
        ))}
      </div>

      {activeRoute.stops.length ? (
        <RoutePlanCard
          plan={activeRoute}
          isEditing={isEditingRoute}
          pinnedStopIds={pinnedStopIds}
          addablePlaces={addablePlaces}
          onCopyAddress={onCopyAddress}
          onAddStop={onAddStop}
          onRemoveStop={onRemoveStop}
          onMoveStop={onMoveStop}
          onTogglePinnedStop={onTogglePinnedStop}
        />
      ) : (
        <div className="mx-6 rounded-[10px] border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
          Save a few places first. Oculi will build a morning and sunset plan from your saved photo spots.
        </div>
      )}

      {savedPhotos.length ? <p className="px-6 pt-4 text-sm text-[var(--muted)]">{savedPhotos.length} saved photo references attached.</p> : null}
      {routeStatus ? <p className="px-6 pt-4 text-sm text-[var(--moss)]">{routeStatus}</p> : null}

      <div className="grid gap-3 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_52px]">
        <a
          className={cx(
            "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--moss)] px-3 text-white shadow-sm transition hover:bg-[var(--moss-dark)]",
            !activeRoute.stops.length && "pointer-events-none opacity-50",
          )}
          href={activeRoute.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span className="grid size-7 place-items-center rounded-md bg-white/15">
            <Navigation className="size-4" />
          </span>
          Google Maps
        </a>
        <a
          className={cx(
            "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-[var(--ink)] shadow-sm transition hover:bg-[var(--chip)]",
            !activeRoute.stops.length && "pointer-events-none opacity-50",
          )}
          href={activeRoute.appleMapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span className="grid size-7 place-items-center rounded-md bg-[var(--chip)] text-[var(--moss)]">
            <Map className="size-4" />
          </span>
          Apple Maps
        </a>
        <button
          type="button"
          className="grid size-12 place-items-center rounded-lg border border-[var(--line)] bg-white shadow-sm transition hover:bg-[var(--chip)]"
          onClick={onRegenerateRoute}
          aria-label="Regenerate route"
        >
          <RefreshCw className="size-5" />
        </button>
        <button
          type="button"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-[var(--ink)] shadow-sm transition hover:bg-[var(--chip)] md:col-span-3"
          onClick={onSaveRoutePlan}
        >
          <span className="grid size-7 place-items-center rounded-md bg-[var(--chip)] text-[var(--moss)]">
            <Save className="size-4" />
          </span>
          Save route plan
        </button>
      </div>
    </aside>
  );
}

function RoutePlanCard({
  plan,
  isEditing,
  pinnedStopIds,
  addablePlaces,
  onCopyAddress,
  onAddStop,
  onRemoveStop,
  onMoveStop,
  onTogglePinnedStop,
}: {
  plan: ShootRoutePlan;
  isEditing: boolean;
  pinnedStopIds: string[];
  addablePlaces: Place[];
  onCopyAddress: (stop: ShootRouteStop) => void;
  onAddStop: (placeId: string) => void;
  onRemoveStop: (placeId: string) => void;
  onMoveStop: (placeId: string, direction: -1 | 1) => void;
  onTogglePinnedStop: (placeId: string) => void;
}) {
  return (
    <section className="border-y border-[var(--line)] px-6 py-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-xl">
            {plan.id === "morning" ? <Sun className="size-5 text-[var(--gold)]" /> : <CloudSun className="size-5 text-orange-500" />}
            {plan.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{plan.summary}</p>
        </div>
        {isEditing ? (
          <label className="relative">
            <span className="sr-only">Add saved place to route</span>
            <select
              className="h-9 rounded-lg border border-[var(--line)] bg-white pl-3 pr-9 text-sm"
              defaultValue=""
              onChange={(event) => {
                if (!event.target.value) return;
                onAddStop(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="">Add stop</option>
              {addablePlaces.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="mb-5 rounded-lg bg-[var(--chip)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
        {plan.confidenceText}
      </div>
      <div className="space-y-4">
        {plan.stops.map((stop, index) => (
          <RouteStopRow
            key={stop.place.id}
            stop={stop}
            index={index}
            stopCount={plan.stops.length}
            isEditing={isEditing}
            isPinned={pinnedStopIds.includes(stop.place.id)}
            onCopyAddress={onCopyAddress}
            onRemoveStop={onRemoveStop}
            onMoveStop={onMoveStop}
            onTogglePinnedStop={onTogglePinnedStop}
          />
        ))}
      </div>
    </section>
  );
}

function RouteStopRow({
  stop,
  index,
  stopCount,
  isEditing,
  isPinned,
  onCopyAddress,
  onRemoveStop,
  onMoveStop,
  onTogglePinnedStop,
}: {
  stop: ShootRouteStop;
  index: number;
  stopCount: number;
  isEditing: boolean;
  isPinned: boolean;
  onCopyAddress: (stop: ShootRouteStop) => void;
  onRemoveStop: (placeId: string) => void;
  onMoveStop: (placeId: string, direction: -1 | 1) => void;
  onTogglePinnedStop: (placeId: string) => void;
}) {
  return (
    <article className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
      <span className="mt-1 grid size-8 place-items-center rounded-full bg-[var(--moss)] text-sm text-white">{index + 1}</span>
      <div className="min-w-0 border-b border-[var(--line)] pb-4 last:border-b-0 last:pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold">{stop.place.name}</h4>
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
              <Clock3 className="size-3.5" />
              {stop.arrivalLabel} · {stop.durationLabel}
            </p>
          </div>
          <span className="rounded-md bg-[var(--chip)] px-2 py-1 text-xs text-[var(--muted)]">{Math.round(stop.score)} match</span>
        </div>
        {isEditing ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] px-2 text-xs disabled:opacity-40"
              onClick={() => onMoveStop(stop.place.id, -1)}
              disabled={index === 0}
            >
              <ArrowUp className="size-3.5" />Move up
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] px-2 text-xs disabled:opacity-40"
              onClick={() => onMoveStop(stop.place.id, 1)}
              disabled={index === stopCount - 1}
            >
              <ArrowDown className="size-3.5" />Move down
            </button>
            <button
              type="button"
              className={cx(
                "inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] px-2 text-xs",
                isPinned && "bg-[var(--chip)]",
              )}
              onClick={() => onTogglePinnedStop(stop.place.id)}
            >
              {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              {isPinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] px-2 text-xs text-red-700"
              onClick={() => onRemoveStop(stop.place.id)}
            >
              <Trash2 className="size-3.5" />Remove
            </button>
          </div>
        ) : null}
        <p className="mt-2 text-sm leading-5 text-[var(--ink)]/80">{stop.note}</p>
        <div className="mt-3 rounded-lg border border-[var(--line)] bg-white p-3">
          <p className="flex items-start gap-2 text-sm leading-5 text-[var(--ink)]">
            <MapPinned className="mt-0.5 size-4 shrink-0 text-[var(--moss)]" />
            <span>
              {stop.address}
              <span className="block font-sans text-xs text-[var(--muted)]">{stop.coordinateLabel}</span>
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--paper-strong)] px-2.5 text-xs shadow-sm transition hover:bg-[var(--chip)]" onClick={() => onCopyAddress(stop)}>
              <span className="grid size-5 place-items-center rounded bg-[var(--chip)] text-[var(--moss)]">
                <Copy className="size-3" />
              </span>
              Copy
            </button>
            <a className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--paper-strong)] px-2.5 text-xs shadow-sm transition hover:bg-[var(--chip)]" href={stop.googleMapsUrl} target="_blank" rel="noreferrer">
              <span className="grid size-5 place-items-center rounded bg-[var(--moss)] text-white">
                <Navigation className="size-3" />
              </span>
              Google <ExternalLink className="size-3" />
            </a>
            <a className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--paper-strong)] px-2.5 text-xs shadow-sm transition hover:bg-[var(--chip)]" href={stop.appleMapsUrl} target="_blank" rel="noreferrer">
              <span className="grid size-5 place-items-center rounded bg-[var(--chip)] text-[var(--moss)]">
                <Map className="size-3" />
              </span>
              Apple <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterToolbar({
  lightFilter,
  sceneFilter,
  hasActiveFilters,
  onLightChange,
  onSceneChange,
  onClear,
}: {
  lightFilter: string;
  sceneFilter: string;
  hasActiveFilters: boolean;
  onLightChange: (item: string) => void;
  onSceneChange: (item: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] p-3 shadow-[0_12px_30px_rgba(39,34,27,0.05)]">
      <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]">
        <SlidersHorizontal className="size-4 text-[var(--moss)]" />
        Filters
      </div>
      <FilterSelect
        label="Light"
        icon={<Sun className="size-4" />}
        value={lightFilter}
        options={["All", "Golden hour", "Blue hour", "Sunrise", "Sunset", "Fog"]}
        onChange={onLightChange}
      />
      <FilterSelect
        label="Scene"
        icon={<Mountain className="size-4" />}
        value={sceneFilter}
        options={["All", "Cityscape", "Landscape", "Coastal", "Architecture", "Street", "Portraits"]}
        onChange={onSceneChange}
      />
      <span className="min-w-0 flex-1 text-sm text-[var(--muted)] max-sm:basis-full">
        {hasActiveFilters ? `${lightFilter} light · ${sceneFilter} scenes` : "All light · All scenes"}
      </span>
      {hasActiveFilters ? (
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-[var(--moss)] transition hover:bg-[var(--chip)]" onClick={onClear}>
          <X className="size-4" />
          Clear
        </button>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: string[];
  onChange: (item: string) => void;
}) {
  return (
    <label className="relative inline-flex h-10 min-w-[11rem] items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm shadow-sm">
      <span className="text-[var(--moss)]">{icon}</span>
      <span className="text-[var(--muted)]">{label}</span>
      <select
        className="min-w-0 flex-1 appearance-none bg-transparent pr-7 text-[var(--ink)] outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} filter`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronRight className="pointer-events-none absolute right-3 size-4 rotate-90 text-[var(--muted)]" />
    </label>
  );
}
