"use client";

import { useMemo, useState } from "react";
import { Bookmark, ChevronRight, Cloud, Grid2X2, MoreHorizontal, Search, Share, Sun } from "lucide-react";
import type { Photo, Place } from "../lib/types";
import type { ReactNode } from "react";

type SavedPanelProps = {
  savedPlaces: Place[];
  savedPhotos?: Photo[];
  onOpenPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
};

export function SavedPanel({
  savedPlaces,
  savedPhotos = [],
  onOpenPlace,
  onToggleSaved,
}: SavedPanelProps) {
  const [query, setQuery] = useState("");
  const [lightFilter, setLightFilter] = useState("All");
  const [sceneFilter, setSceneFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [routeStatus, setRouteStatus] = useState("");

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
  const routePlaces = filteredPlaces.length ? filteredPlaces.slice(0, 5) : savedPlaces.slice(0, 5);

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-5xl font-semibold tracking-tight text-[var(--ink)]">
            Saved places <span className="align-middle text-base font-normal text-[var(--muted)]">{savedPlaces.length} saved</span>
          </h1>
          <div className="flex items-center gap-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--ink)]/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-56 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] pl-12 pr-4 outline-none max-sm:w-full"
                placeholder="Search saved"
                aria-label="Search saved places"
              />
            </label>
            <button className="inline-flex h-12 items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-4">Recently saved <ChevronRight className="size-4 rotate-90" /></button>
            <button className="grid size-12 place-items-center rounded-lg border border-[var(--line)] bg-[var(--paper-strong)]"><Grid2X2 className="size-5" /></button>
          </div>
        </div>
        <div className="space-y-4">
          <FilterRow title="Best light" items={["All", "Golden hour", "Blue hour", "Sunrise", "Sunset", "Fog"]} active={lightFilter} onSelect={setLightFilter} />
          <FilterRow title="Scene type" items={["All", "Cityscape", "Landscape", "Coastal", "Architecture", "Street", "Portraits"]} active={sceneFilter} onSelect={setSceneFilter} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(visiblePlaces.length ? visiblePlaces : []).map((place) => (
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
                    <p className="mt-1 text-sm text-[var(--muted)]">San Francisco, CA</p>
                  </button>
                  <button type="button" className="grid size-9 place-items-center rounded-md text-[var(--gold)] hover:bg-[var(--chip)]" onClick={() => onToggleSaved?.(place.id)} aria-label={`Remove ${place.name} from saved places`}>
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
            No saved places match those filters.
          </div>
        ) : null}
        <div className="flex justify-center gap-5 text-[var(--muted)]">
          <span>Showing {visiblePlaces.length} of {filteredPlaces.length} saved places</span>
          {filteredPlaces.length > 6 ? (
            <button className="rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-8 py-3 text-[var(--ink)]" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Show less" : "Load more"}
            </button>
          ) : null}
        </div>
      </div>
      <aside className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_16px_42px_rgba(39,34,27,0.08)]">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-2xl font-semibold">Plan a shoot day</h2>
          <ChevronRight className="size-5 -rotate-45" />
        </div>
        <div className="relative h-64 bg-[#e7ece5]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_35%,#f7f1e7_0_22%,transparent_23%),linear-gradient(120deg,transparent_0_45%,#b9d6e1_46%_66%,transparent_67%)]" />
          {routePlaces.map((place, index) => (
            <span key={place.id} className="absolute grid size-8 place-items-center rounded-full bg-[var(--moss)] text-sm text-white ring-2 ring-white" style={{ left: `${20 + index * 14}%`, top: `${30 + (index % 2) * 24}%` }}>{index + 1}</span>
          ))}
          <span className="absolute left-[45%] top-[42%] text-lg">San Francisco</span>
        </div>
        <RouteBlock title="Morning route" icon={<Sun className="size-5 text-[var(--gold)]" />} items={routePlaces.slice(0, 3).map((place) => place.name)} />
        <RouteBlock title="Sunset route" icon={<Cloud className="size-5 text-orange-500" />} items={routePlaces.slice(3, 5).map((place) => place.name)} />
        {savedPhotos.length ? <p className="px-6 pb-3 text-sm text-[var(--muted)]">{savedPhotos.length} saved photo references attached.</p> : null}
        {routeStatus ? <p className="px-6 pb-3 text-sm text-[var(--moss)]">{routeStatus}</p> : null}
        <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-3 p-6 pt-2">
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--moss)] text-white" onClick={() => setRouteStatus(`Demo route ready: ${routePlaces.map((place) => place.name).join(" → ") || "save a place first"}.`)}>
            <Share className="size-5" />Export route
          </button>
          <button className="grid size-12 place-items-center rounded-lg border border-[var(--line)] bg-white"><MoreHorizontal className="size-5" /></button>
        </div>
      </aside>
    </section>
  );
}

function FilterRow({ title, items, active, onSelect }: { title: string; items: string[]; active: string; onSelect: (item: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-base text-[var(--ink)]">{title}</p>
      <div className="flex flex-wrap gap-3">
        {items.map((item, index) => (
          <button key={item} type="button" onClick={() => onSelect(item)} className={`rounded-lg border border-[var(--line)] px-4 py-2 text-sm ${active === item ? "bg-[var(--moss)] text-white" : "bg-[var(--paper-strong)] text-[var(--ink)]"}`}>{item}</button>
        ))}
      </div>
    </div>
  );
}

function RouteBlock({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  return (
    <section className="border-t border-[var(--line)] px-6 py-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg">{icon}{title}</h3>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item} className="flex items-center gap-3 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--moss)] text-xs text-white">{index + 1}</span>
            <span><strong className="block font-normal text-[var(--ink)]">{item}</strong><span className="text-[var(--muted)]">Arrive {index + 6}:00 AM · 45 min</span></span>
          </div>
        ))}
      </div>
    </section>
  );
}
