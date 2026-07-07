"use client";

import { MapPin, Navigation, Sparkles } from "lucide-react";
import type { Place } from "../lib/types";

type StylizedMapProps = {
  places: Place[];
  selectedPlaceId?: string;
  savedPlaceIds?: string[];
  onSelectPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
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
  selectedPlaceId,
  savedPlaceIds = [],
  onSelectPlace,
  onToggleSaved,
  className,
}: StylizedMapProps) {
  const selected = places.find((place) => place.id === selectedPlaceId) || places[0];

  return (
    <section className={cx("overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm", className)} aria-label="Map preview">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">SF Photo Map</h2>
          <p className="text-xs text-zinc-500">Stylized preview, Mapbox-ready props</p>
        </div>
        <Navigation className="size-4 text-zinc-500" aria-hidden="true" />
      </div>

      <div className="relative h-72 overflow-hidden bg-[linear-gradient(135deg,#fafafa_0%,#f4f4f5_46%,#e4e4e7_100%)]">
        <div className="absolute inset-0 opacity-80">
          <div className="absolute left-[12%] top-[20%] h-[1px] w-[78%] rotate-[-16deg] bg-zinc-300" />
          <div className="absolute left-[8%] top-[54%] h-[1px] w-[90%] rotate-[9deg] bg-zinc-300" />
          <div className="absolute left-[34%] top-[-10%] h-[120%] w-[1px] rotate-[18deg] bg-zinc-300" />
          <div className="absolute left-[68%] top-[-6%] h-[115%] w-[1px] rotate-[-8deg] bg-zinc-300" />
          <div className="absolute bottom-[-18%] right-[-10%] h-44 w-56 rounded-full border border-zinc-300 bg-white/40" />
        </div>

        {places.map((place) => {
          const position = pinPosition(place, places);
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
                  "flex size-8 items-center justify-center rounded-full shadow-sm ring-2 ring-white",
                  isSelected ? "bg-zinc-950 text-white" : isSaved ? "bg-emerald-700 text-white" : "bg-white text-zinc-900",
                )}
              >
                <MapPin className="size-4" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-zinc-950">{selected.name}</h3>
              <p className="truncate text-xs text-zinc-500">{selected.fuzzyLocationLabel}</p>
            </div>
            <button
              type="button"
              className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
              onClick={() => onToggleSaved?.(selected.id)}
            >
              {savedPlaceIds.includes(selected.id) ? "Saved" : "Save"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
                {tag}
              </span>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {selected.timCurated ? "Curated for the demo route" : `${selected.saveCount} saves nearby`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
