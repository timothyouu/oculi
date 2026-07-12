"use client";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent, type ReactNode } from "react";
import {
  Bookmark,
  ChevronRight,
  Copy,
  ExternalLink,
  GripVertical,
  Map,
  MapPinned,
  MoreHorizontal,
  Mountain,
  Navigation,
  Plus,
  Route,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { MapboxMap } from "@/components/mapbox-map";
import { ResilientImage } from "@/components/resilient-image";
import { useDemoState } from "@/lib/demo-state";
import { formatPlaceLocation } from "@/lib/location-labels";
import {
  buildItinerary,
  itineraryAppleMapsUrl,
  itineraryGoogleMapsUrl,
  type ItineraryStop,
} from "@/lib/itinerary";
import type { Photo, Place } from "../lib/types";

type SavedPanelProps = {
  savedPlaces: Place[];
  savedPhotos?: Photo[];
  savedCount?: number;
  itineraryPlaces?: Place[];
  onOpenPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
  onAddToItinerary?: (placeId: string) => void;
  onRemoveFromItinerary?: (placeId: string) => void;
  onReorderItinerary?: (placeId: string, nextIndex: number) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isInteractiveDragTarget(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest("button,a,input,select,textarea"));
}

export function SavedPanel({
  savedPlaces,
  savedPhotos = [],
  savedCount = savedPlaces.length,
  itineraryPlaces = [],
  onOpenPlace,
  onToggleSaved,
  onAddToItinerary,
  onRemoveFromItinerary,
  onReorderItinerary,
}: SavedPanelProps) {
  const { areas } = useDemoState();
  const [query, setQuery] = useState("");
  const [lightFilter, setLightFilter] = useState("All");
  const [sceneFilter, setSceneFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [placePendingRemoval, setPlacePendingRemoval] = useState<Place | null>(null);
  const [openMenuPlaceId, setOpenMenuPlaceId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [itineraryStatus, setItineraryStatus] = useState("");
  const hasActiveFilters = lightFilter !== "All" || sceneFilter !== "All";

  const itineraryPlaceIds = useMemo(() => new Set(itineraryPlaces.map((place) => place.id)), [itineraryPlaces]);

  const savedPhotoTextByPlace = useMemo(
    () =>
      savedPhotos.reduce<Record<string, string>>((groups, photo) => {
        groups[photo.placeId] = [
          groups[photo.placeId],
          photo.caption,
          photo.locationLabel,
          photo.metadataText,
          photo.shotAtTimeOfDay,
          ...photo.tags,
        ]
          .filter(Boolean)
          .join(" ");
        return groups;
      }, {}),
    [savedPhotos],
  );

  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return savedPlaces.filter((place) => {
      const savedSearchText = [
        place.name,
        place.fuzzyLocationLabel,
        place.description,
        ...place.bestTimes,
        ...place.tags,
        savedPhotoTextByPlace[place.id],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalized || savedSearchText.includes(normalized);
      const matchesLight = lightFilter === "All" || place.bestTimes.some((time) => time.toLowerCase().includes(lightFilter.toLowerCase()));
      const matchesScene = sceneFilter === "All" || place.tags.some((tag) => tag.toLowerCase().includes(sceneFilter.toLowerCase()));
      return matchesQuery && matchesLight && matchesScene;
    });
  }, [lightFilter, query, savedPhotoTextByPlace, savedPlaces, sceneFilter]);

  const visiblePlaces = showAll ? filteredPlaces : filteredPlaces.slice(0, 6);

  // Places the user can still add to the itinerary: saved places not already in it.
  const addableSavedPlaces = useMemo(
    () => savedPlaces.filter((place) => !itineraryPlaceIds.has(place.id)),
    [itineraryPlaceIds, savedPlaces],
  );

  const itineraryStops = useMemo(() => buildItinerary(itineraryPlaces), [itineraryPlaces]);

  // Close an open card menu on outside click or Escape.
  useEffect(() => {
    if (!openMenuPlaceId) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-card-menu]")) return;
      setOpenMenuPlaceId(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuPlaceId(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuPlaceId]);

  function addPlaceToItinerary(place: Place) {
    if (itineraryPlaceIds.has(place.id)) return;
    onAddToItinerary?.(place.id);
    setItineraryStatus(`Added ${place.name} to your itinerary.`);
  }

  function removePlaceFromItinerary(place: Place) {
    onRemoveFromItinerary?.(place.id);
    setItineraryStatus(`Removed ${place.name} from your itinerary.`);
  }

  async function copyAddress(stop: ItineraryStop) {
    const value = `${stop.place.name}\n${stop.address}\n${stop.coordinateLabel}`;
    try {
      await navigator.clipboard.writeText(value);
      setItineraryStatus(`Copied ${stop.place.name} address.`);
    } catch {
      setItineraryStatus(`${stop.place.name}: ${stop.address}`);
    }
  }

  return (
    <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--ink)] 2xl:text-5xl">
            Saved places <span className="ml-2 inline-block whitespace-nowrap align-middle text-base font-normal text-[var(--muted)]">{savedCount} saved</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <button className="inline-flex h-12 items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4">
              Recently saved <ChevronRight className="size-4 rotate-90" />
            </button>
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
            <SavedPlaceCard
              key={place.id}
              place={place}
              areas={areas}
              isInItinerary={itineraryPlaceIds.has(place.id)}
              isMenuOpen={openMenuPlaceId === place.id}
              onOpenPlace={onOpenPlace}
              onToggleMenu={() => setOpenMenuPlaceId((current) => (current === place.id ? null : place.id))}
              onCloseMenu={() => setOpenMenuPlaceId(null)}
              onRequestRemoveSaved={() => setPlacePendingRemoval(place)}
              onAddToItinerary={() => addPlaceToItinerary(place)}
              onRemoveFromItinerary={() => removePlaceFromItinerary(place)}
            />
          ))}
        </div>
        {!savedPlaces.length ? (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--paper-strong)] p-8 text-center text-[var(--muted)]">
            No bookmarked places yet. Swipe right or tap a ribbon to build a shoot list.
          </div>
        ) : null}
        {savedPlaces.length && !filteredPlaces.length ? (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--paper-strong)] p-8 text-center text-[var(--muted)]">
            No saved places match those filters.
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
      <ItineraryPanel
        stops={itineraryStops}
        savedPlaces={savedPlaces}
        savedPhotos={savedPhotos}
        itineraryStatus={itineraryStatus}
        onOpenPlace={onOpenPlace}
        onToggleSaved={onToggleSaved}
        onOpenAddDialog={() => setIsAddDialogOpen(true)}
        onRemoveStop={(placeId) => {
          const place = itineraryPlaces.find((item) => item.id === placeId);
          if (place) removePlaceFromItinerary(place);
        }}
        onReorderStop={(placeId, nextIndex) => onReorderItinerary?.(placeId, nextIndex)}
        onCopyAddress={copyAddress}
      />
      {placePendingRemoval ? (
        <ConfirmRemoveSavedPlaceDialog
          place={placePendingRemoval}
          onCancel={() => setPlacePendingRemoval(null)}
          onConfirm={() => {
            onToggleSaved?.(placePendingRemoval.id);
            setPlacePendingRemoval(null);
          }}
        />
      ) : null}
      {isAddDialogOpen ? (
        <ItineraryAddDialog
          places={addableSavedPlaces}
          areas={areas}
          onAdd={addPlaceToItinerary}
          onClose={() => setIsAddDialogOpen(false)}
        />
      ) : null}
    </section>
  );
}

function SavedPlaceCard({
  place,
  areas,
  isInItinerary,
  isMenuOpen,
  onOpenPlace,
  onToggleMenu,
  onCloseMenu,
  onRequestRemoveSaved,
  onAddToItinerary,
  onRemoveFromItinerary,
}: {
  place: Place;
  areas: ReturnType<typeof useDemoState>["areas"];
  isInItinerary: boolean;
  isMenuOpen: boolean;
  onOpenPlace?: (placeId: string) => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onRequestRemoveSaved: () => void;
  onAddToItinerary: () => void;
  onRemoveFromItinerary: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_16px_42px_rgba(39,34,27,0.08)]">
      <button type="button" className="relative block w-full text-left" onClick={() => onOpenPlace?.(place.id)}>
        <ResilientImage src={place.coverPhotoUrl} alt="" className="aspect-[4/3] w-full object-cover" />
      </button>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" className="min-w-0 text-left" onClick={() => onOpenPlace?.(place.id)}>
            <h2 className="truncate text-xl font-semibold text-[var(--ink)]">{place.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{formatPlaceLocation(place, areas)}</p>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="grid size-9 place-items-center rounded-md text-[var(--gold)] hover:bg-[var(--chip)]"
              onClick={onRequestRemoveSaved}
              aria-label={`Remove ${place.name} from saved places`}
            >
              <Bookmark className="size-5 fill-current" />
            </button>
            <div className="relative" data-card-menu>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-md text-[var(--ink)] hover:bg-[var(--chip)]"
                onClick={onToggleMenu}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-label={`More actions for ${place.name}`}
              >
                <MoreHorizontal className="size-5" />
              </button>
              {isMenuOpen ? (
                <div
                  role="menu"
                  aria-label={`Actions for ${place.name}`}
                  className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-lg border border-[var(--line)] bg-white py-1 shadow-[0_16px_42px_rgba(39,34,27,0.18)]"
                >
                  {isInItinerary ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--ink)] hover:bg-[var(--chip)]"
                      onClick={() => {
                        onRemoveFromItinerary();
                        onCloseMenu();
                      }}
                    >
                      <Trash2 className="size-4 text-[var(--muted)]" />
                      Remove from itinerary
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--ink)] hover:bg-[var(--chip)]"
                      onClick={() => {
                        onAddToItinerary();
                        onCloseMenu();
                      }}
                    >
                      <Plus className="size-4 text-[var(--moss)]" />
                      Add to itinerary
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--ink)] hover:bg-[var(--chip)]"
                    onClick={() => {
                      onOpenPlace?.(place.id);
                      onCloseMenu();
                    }}
                  >
                    <MapPinned className="size-4 text-[var(--muted)]" />
                    Open place
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isInItinerary ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--moss)]/12 px-3 py-1.5 text-xs font-medium text-[var(--moss)]">
              <Route className="size-3.5" />
              In itinerary
            </span>
          ) : null}
          {place.tags.slice(0, isInItinerary ? 2 : 3).map((tag) => (
            <span key={tag} className="rounded-md bg-[var(--chip)] px-3 py-1.5 text-xs text-[var(--ink)]/80">{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function ConfirmRemoveSavedPlaceDialog({
  place,
  onCancel,
  onConfirm,
}: {
  place: Place;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-remove-saved-place-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-5 text-[var(--ink)]"
        style={{ boxShadow: "var(--elevated-shadow)" }}
      >
        <p id="confirm-remove-saved-place-title" className="text-lg font-semibold">
          Remove {place.name} from saved?
        </p>
        <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
          It will no longer appear in your saved places or be available for your itinerary.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)] shadow-sm transition hover:bg-[var(--chip)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm text-white shadow-sm transition hover:bg-red-700"
            onClick={onConfirm}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function ItineraryPanel({
  stops,
  savedPlaces,
  savedPhotos,
  itineraryStatus,
  onOpenPlace,
  onToggleSaved,
  onOpenAddDialog,
  onRemoveStop,
  onReorderStop,
  onCopyAddress,
}: {
  stops: ItineraryStop[];
  savedPlaces: Place[];
  savedPhotos: Photo[];
  itineraryStatus: string;
  onOpenPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
  onOpenAddDialog: () => void;
  onRemoveStop: (placeId: string) => void;
  onReorderStop: (placeId: string, nextIndex: number) => void;
  onCopyAddress: (stop: ItineraryStop) => void;
}) {
  const itineraryPlaces = stops.map((stop) => stop.place);
  const previewPlaces = itineraryPlaces.length ? itineraryPlaces : savedPlaces.slice(0, 5);
  const googleMapsUrl = itineraryGoogleMapsUrl(itineraryPlaces);
  const appleMapsUrl = itineraryAppleMapsUrl(itineraryPlaces);

  return (
    <aside className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_16px_42px_rgba(39,34,27,0.08)] xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div>
          <p className="mb-1 text-sm text-[var(--muted)]">Saved</p>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Route className="size-6 text-[var(--moss)]" />
            Itinerary
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {stops.length ? `${stops.length} stop${stops.length === 1 ? "" : "s"}` : "No stops yet"}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--moss)] px-3.5 text-sm text-white shadow-sm transition hover:bg-[var(--moss-dark)]"
          onClick={onOpenAddDialog}
          aria-label="Add saved place to itinerary"
        >
          <Plus className="size-4" />
          Add
        </button>
      </div>

      <div className="px-4">
        <MapboxMap
          places={previewPlaces}
          photos={savedPhotos}
          selectedPlaceId={stops[0]?.place.id}
          savedPlaceIds={savedPlaces.map((place) => place.id)}
          onSelectPlace={onOpenPlace}
          onToggleSaved={onToggleSaved}
          onOpenPlace={onOpenPlace}
          showSelectedCard={false}
          autoFocusSelected={false}
          requireMapbox={false}
          className="h-56 rounded-[10px] border border-[var(--line)]"
        />
      </div>

      {stops.length ? (
        <ItineraryList stops={stops} onRemoveStop={onRemoveStop} onReorderStop={onReorderStop} onCopyAddress={onCopyAddress} />
      ) : (
        <div className="mx-6 my-5 rounded-[10px] border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
          Your itinerary is empty. Tap <span className="font-medium text-[var(--ink)]">Add</span> to pick from your saved places, or use the three-dots menu on any saved place.
        </div>
      )}

      {itineraryStatus ? <p className="px-6 pt-1 text-sm text-[var(--moss)]">{itineraryStatus}</p> : null}

      <div className="grid gap-3 p-6 md:grid-cols-2">
        <a
          className={cx(
            "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--moss)] px-3 text-white shadow-sm transition hover:bg-[var(--moss-dark)]",
            !stops.length && "pointer-events-none opacity-50",
          )}
          href={googleMapsUrl}
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
            !stops.length && "pointer-events-none opacity-50",
          )}
          href={appleMapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span className="grid size-7 place-items-center rounded-md bg-[var(--chip)] text-[var(--moss)]">
            <Map className="size-4" />
          </span>
          Apple Maps
        </a>
      </div>
    </aside>
  );
}

function ItineraryList({
  stops,
  onRemoveStop,
  onReorderStop,
  onCopyAddress,
}: {
  stops: ItineraryStop[];
  onRemoveStop: (placeId: string) => void;
  onReorderStop: (placeId: string, nextIndex: number) => void;
  onCopyAddress: (stop: ItineraryStop) => void;
}) {
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
  const draggingStopIdRef = useRef<string | null>(null);
  const dragStartedRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });

  function startPointerDrag(event: PointerEvent<HTMLElement>, placeId: string) {
    if (isInteractiveDragTarget(event.target)) return;
    draggingStopIdRef.current = placeId;
    dragStartedRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDragged(clientX: number, clientY: number) {
    const draggedPlaceId = draggingStopIdRef.current;
    if (!draggedPlaceId) return false;

    const deltaX = Math.abs(clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(clientY - pointerStartRef.current.y);
    if (!dragStartedRef.current && deltaX + deltaY < 6) return false;

    dragStartedRef.current = true;
    setDraggingStopId(draggedPlaceId);

    const overElement = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-itinerary-stop-id]");
    const overPlaceId = overElement?.dataset.itineraryStopId;
    if (!overPlaceId || overPlaceId === draggedPlaceId) return true;

    const nextIndex = stops.findIndex((stop) => stop.place.id === overPlaceId);
    if (nextIndex >= 0) onReorderStop(draggedPlaceId, nextIndex);
    return true;
  }

  function movePointerDrag(event: PointerEvent<HTMLElement>) {
    if (moveDragged(event.clientX, event.clientY)) event.preventDefault();
  }

  function endPointerDrag(event: PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingStopIdRef.current = null;
    dragStartedRef.current = false;
    setDraggingStopId(null);
  }

  function startMouseDrag(event: ReactMouseEvent<HTMLElement>, placeId: string) {
    if (isInteractiveDragTarget(event.target)) return;
    draggingStopIdRef.current = placeId;
    dragStartedRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  }

  function moveMouseDrag(event: ReactMouseEvent<HTMLElement>) {
    if (moveDragged(event.clientX, event.clientY)) event.preventDefault();
  }

  function endMouseDrag() {
    draggingStopIdRef.current = null;
    dragStartedRef.current = false;
    setDraggingStopId(null);
  }

  return (
    <div
      className="space-y-3 border-t border-[var(--line)] px-6 py-5"
      onMouseMove={moveMouseDrag}
      onMouseUp={endMouseDrag}
      onMouseLeave={endMouseDrag}
    >
      {stops.map((stop, index) => (
        <ItineraryStopRow
          key={stop.place.id}
          stop={stop}
          index={index}
          isDragging={draggingStopId === stop.place.id}
          onCopyAddress={onCopyAddress}
          onRemoveStop={onRemoveStop}
          onMouseDown={(event) => startMouseDrag(event, stop.place.id)}
          onPointerDown={(event) => startPointerDrag(event, stop.place.id)}
          onPointerMove={movePointerDrag}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
        />
      ))}
    </div>
  );
}

function ItineraryStopRow({
  stop,
  index,
  isDragging,
  onCopyAddress,
  onRemoveStop,
  onMouseDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  stop: ItineraryStop;
  index: number;
  isDragging: boolean;
  onCopyAddress: (stop: ItineraryStop) => void;
  onRemoveStop: (placeId: string) => void;
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
}) {
  return (
    <article
      className={cx(
        "group relative min-h-[9rem] touch-none select-none cursor-grab overflow-hidden rounded-[10px] border border-white/60 bg-[var(--chip)] text-white shadow-[0_16px_38px_rgba(39,34,27,0.18)] transition active:cursor-grabbing",
        isDragging && "scale-[0.985] opacity-60 ring-2 ring-[var(--gold)]",
      )}
      data-itinerary-stop-id={stop.place.id}
      onMouseDown={onMouseDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <ResilientImage src={stop.place.coverPhotoUrl} alt="" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/48 to-black/18" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/72 to-transparent" />

      <div className="relative flex min-h-[9rem] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/45 bg-white/20 font-sans text-sm font-semibold backdrop-blur">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h4 className="truncate text-lg font-semibold drop-shadow-sm">{stop.place.name}</h4>
              <p className="mt-1 flex items-center gap-1.5 font-sans text-xs text-white/82">
                <MapPinned className="size-3.5 text-[var(--gold)]" />
                {stop.place.fuzzyLocationLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="grid size-8 place-items-center rounded-md bg-white/18 backdrop-blur" aria-hidden="true">
              <GripVertical className="size-4" />
            </span>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-md bg-white/18 text-white shadow-sm backdrop-blur transition hover:bg-red-500/60"
              onClick={() => onRemoveStop(stop.place.id)}
              aria-label={`Remove ${stop.place.name} from itinerary`}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-white/8 p-3 text-white shadow-sm backdrop-blur-md">
          <p className="flex items-start gap-2 font-sans text-xs leading-5 text-white/90">
            <MapPinned className="mt-0.5 size-4 shrink-0 text-[var(--gold)]" />
            <span className="min-w-0">
              <span className="block truncate">{stop.address}</span>
              <span className="block truncate text-white/66">{stop.coordinateLabel}</span>
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 font-sans text-xs shadow-sm backdrop-blur transition hover:bg-white/18" onClick={() => onCopyAddress(stop)}>
              <Copy className="size-3.5" />
              Copy
            </button>
            <a className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 font-sans text-xs shadow-sm backdrop-blur transition hover:bg-white/18" href={stop.googleMapsUrl} target="_blank" rel="noreferrer">
              <Navigation className="size-3.5" />
              Google <ExternalLink className="size-3" />
            </a>
            <a className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 font-sans text-xs shadow-sm backdrop-blur transition hover:bg-white/18" href={stop.appleMapsUrl} target="_blank" rel="noreferrer">
              <Map className="size-3.5" />
              Apple <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function ItineraryAddDialog({
  places,
  areas,
  onAdd,
  onClose,
}: {
  places: Place[];
  areas: ReturnType<typeof useDemoState>["areas"];
  onAdd: (place: Place) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add saved places to itinerary"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]"
        style={{ boxShadow: "var(--elevated-shadow)" }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-lg font-semibold">Add to itinerary</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Pick from your saved places.</p>
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-md text-[var(--ink)] transition hover:bg-[var(--chip)]"
            onClick={onClose}
            aria-label="Close add-to-itinerary dialog"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {places.length ? (
            <ul className="space-y-2">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-[var(--line)] bg-white p-2.5 text-left shadow-sm transition hover:bg-[var(--chip)]"
                    onClick={() => onAdd(place)}
                    aria-label={`Add ${place.name} to itinerary`}
                  >
                    <ResilientImage src={place.coverPhotoUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[var(--ink)]">{place.name}</span>
                      <span className="block truncate text-sm text-[var(--muted)]">{formatPlaceLocation(place, areas)}</span>
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--moss)] text-white">
                      <Plus className="size-4" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
              Every saved place is already in your itinerary. Save more places to add them here.
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-[var(--line)] px-5 py-4">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)] shadow-sm transition hover:bg-[var(--chip)]"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
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
