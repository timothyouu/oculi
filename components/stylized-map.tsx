"use client";

import { Bookmark, Navigation, Plus, Send, ZoomOut } from "lucide-react";
import type { Photo, Place } from "../lib/types";

type StylizedMapProps = {
  places: Place[];
  photos?: Photo[];
  selectedPlaceId?: string;
  savedPlaceIds?: string[];
  onSelectPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  showSelectedCard?: boolean;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pinPosition(place: Place, places: Place[]) {
  if (places.length < 2) return { left: 50, top: 50 };
  const lats = places.map((item) => item.lat);
  const lngs = places.map((item) => item.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const lngSpan = maxLng - minLng || 1;
  const latSpan = maxLat - minLat || 1;
  return {
    left: 8 + ((place.lng - minLng) / lngSpan) * 84,
    top: 8 + (1 - (place.lat - minLat) / latSpan) * 84,
  };
}

export function StylizedMap({
  places,
  photos = [],
  selectedPlaceId,
  savedPlaceIds = [],
  onSelectPlace,
  onToggleSaved,
  onOpenPlace,
  showSelectedCard = true,
  className,
}: StylizedMapProps) {
  const selected = places.find((place) => place.id === selectedPlaceId) || places[0];
  const photoCounts = photos.reduce<Record<string, number>>((counts, photo) => {
    counts[photo.placeId] = (counts[photo.placeId] ?? 0) + 1;
    return counts;
  }, {});
  const placeNodes = places
    .map((place) => ({
      place,
      photoCount: photoCounts[place.id] ?? 0,
      position: pinPosition(place, places),
    }))
    .sort((a, b) => b.photoCount - a.photoCount || b.place.saveCount - a.place.saveCount);

  return (
    <section className={cx("relative overflow-hidden rounded-none bg-[#e8eee7]", className)} aria-label="Map preview">
      <div className="absolute right-8 top-8 z-20 overflow-hidden rounded-[18px] border border-[var(--line)] bg-white shadow-[0_12px_30px_rgba(39,34,27,0.12)]">
        {[Navigation, Plus, ZoomOut].map((Icon, index) => (
          <button key={index} type="button" className="grid size-14 place-items-center border-b border-[var(--line)] last:border-0 text-[var(--ink)]">
            <Icon className="size-5" />
          </button>
        ))}
      </div>

      <div className="relative h-full min-h-[640px] overflow-hidden bg-[#e7ece5]">
        <div className="absolute inset-0 opacity-90">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_40%,rgba(255,253,248,0.92)_0_18%,transparent_19%),radial-gradient(circle_at_72%_58%,rgba(255,253,248,0.9)_0_14%,transparent_15%),linear-gradient(115deg,transparent_0_42%,rgba(185,214,225,0.9)_43%_58%,transparent_59%)]" />
          <div className="absolute -left-[10%] top-[10%] h-[34%] w-[58%] rounded-[48%] bg-[#cfdac5]" />
          <div className="absolute left-[18%] top-[28%] h-[70%] w-[60%] rounded-[46%] bg-[#f5f1e8]" />
          <div className="absolute -right-[12%] top-[34%] h-[40%] w-[42%] rounded-[42%] bg-[#d5e1d1]" />
          <div className="absolute left-[34%] top-[-10%] h-[120%] w-[3px] rotate-[18deg] bg-[#d8bea0]/70" />
          <div className="absolute left-[8%] top-[52%] h-[3px] w-[90%] rotate-[9deg] bg-[#d8bea0]/70" />
          <div className="absolute left-[22%] top-[62%] h-[2px] w-[70%] rotate-[-18deg] bg-[#d8bea0]/60" />
          <p className="absolute left-[42%] top-[47%] text-4xl text-[var(--ink)]">San Francisco</p>
          <p className="absolute left-[34%] top-[28%] text-lg text-[var(--muted)]">Presidio</p>
          <p className="absolute left-[8%] top-[23%] text-lg leading-tight text-[var(--muted)]">Marin<br />Headlands</p>
          <p className="absolute left-[10%] top-[36%] text-lg text-[#52738a]">Golden Gate</p>
        </div>

        {placeNodes.map(({ place, photoCount, position }, index) => {
          const isSelected = place.id === selected?.id;
          const isSaved = savedPlaceIds.includes(place.id);
          return (
            <button
              key={place.id}
              type="button"
              className={cx(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                isSelected ? "z-20 scale-110" : "z-10 hover:scale-105",
              )}
              style={{ left: `${position.left}%`, top: `${position.top}%` }}
              aria-label={`Select ${place.name}`}
              onClick={() => onSelectPlace?.(place.id)}
            >
              <span
                className={cx(
                  "flex h-11 min-w-12 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold shadow-[0_6px_14px_rgba(39,34,27,0.22)] ring-2 ring-white",
                  isSelected ? "bg-[var(--gold)] text-white" : isSaved ? "bg-[var(--moss)] text-white" : "bg-[var(--moss)] text-white",
                )}
              >
                <span className="text-base leading-none">{photoCount}</span>
                <span className="text-[10px] leading-none opacity-80">#{index + 1}</span>
              </span>
            </button>
          );
        })}
      </div>

      {showSelectedCard && selected ? (
        <div className="absolute bottom-8 right-8 z-20 w-[340px] overflow-hidden rounded-[22px] border border-white/60 bg-[var(--paper-strong)] shadow-[0_18px_50px_rgba(39,34,27,0.18)] max-md:inset-x-4 max-md:bottom-4 max-md:w-auto">
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
