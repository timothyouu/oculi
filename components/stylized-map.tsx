"use client";

import { useMemo, useState } from "react";
import { Navigation, Plus, ZoomOut } from "lucide-react";
import { buildPlacePhotoNodes, clusterPlacePhotoNodes } from "@/lib/map-clusters";
import type { Photo, Place } from "../lib/types";
import { SelectedPlaceCard } from "./selected-place-card";

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

function pinPosition(point: { lat: number; lng: number }, places: Place[]) {
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
    left: 8 + ((point.lng - minLng) / lngSpan) * 84,
    top: 8 + (1 - (point.lat - minLat) / latSpan) * 84,
  };
}

const stylizedClusterSizes = [0.09, 0.04, 0.018, 0];

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
  const [detailLevel, setDetailLevel] = useState(1);
  const selected = places.find((place) => place.id === selectedPlaceId) || places[0];
  const placeNodes = useMemo(() => buildPlacePhotoNodes(places, photos), [photos, places]);
  const placeClusters = useMemo(
    () =>
      clusterPlacePhotoNodes(placeNodes, stylizedClusterSizes[detailLevel]).map((cluster) => ({
        ...cluster,
        position: pinPosition(cluster, places),
      })),
    [detailLevel, placeNodes, places],
  );

  return (
    <section className={cx("relative overflow-hidden rounded-none bg-[#e8eee7]", className)} aria-label="Map preview">
      <div className="absolute right-8 top-8 z-20 overflow-hidden rounded-[18px] border border-[var(--line)] bg-white shadow-[0_12px_30px_rgba(39,34,27,0.12)]">
        <button type="button" className="grid size-14 place-items-center border-b border-[var(--line)] text-[var(--ink)]" aria-label="Center map">
          <Navigation className="size-5" />
        </button>
        <button
          type="button"
          className="grid size-14 place-items-center border-b border-[var(--line)] text-[var(--ink)] disabled:text-[var(--muted)]"
          aria-label="Show more specific photo groups"
          disabled={detailLevel === stylizedClusterSizes.length - 1}
          onClick={() => setDetailLevel((level) => Math.min(level + 1, stylizedClusterSizes.length - 1))}
        >
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          className="grid size-14 place-items-center text-[var(--ink)] disabled:text-[var(--muted)]"
          aria-label="Show broader photo groups"
          disabled={detailLevel === 0}
          onClick={() => setDetailLevel((level) => Math.max(level - 1, 0))}
        >
          <ZoomOut className="size-5" />
        </button>
      </div>

      <div className="relative h-full min-h-[560px] overflow-hidden bg-[#e7ece5] lg:min-h-full">
        <div className="absolute inset-0 opacity-90">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_40%,rgba(255,253,248,0.92)_0_18%,transparent_19%),radial-gradient(circle_at_72%_58%,rgba(255,253,248,0.9)_0_14%,transparent_15%),linear-gradient(115deg,transparent_0_42%,rgba(185,214,225,0.9)_43%_58%,transparent_59%)]" />
          <div className="absolute -left-[10%] top-[10%] h-[34%] w-[58%] rounded-[48%] bg-[#cfdac5]" />
          <div className="absolute left-[18%] top-[28%] h-[70%] w-[60%] rounded-[46%] bg-[#f5f1e8]" />
          <div className="absolute -right-[12%] top-[34%] h-[40%] w-[42%] rounded-[42%] bg-[#d5e1d1]" />
          <div className="absolute left-[34%] top-[-10%] h-[120%] w-[3px] rotate-[18deg] bg-[#d8bea0]/70" />
          <div className="absolute left-[8%] top-[52%] h-[3px] w-[90%] rotate-[9deg] bg-[#d8bea0]/70" />
          <div className="absolute left-[22%] top-[62%] h-[2px] w-[70%] rotate-[-18deg] bg-[#d8bea0]/60" />
          <p className="absolute left-[38%] top-[47%] text-4xl text-[var(--ink)]">Oculi Map</p>
          <p className="absolute left-[34%] top-[28%] text-lg text-[var(--muted)]">City spots</p>
          <p className="absolute left-[8%] top-[23%] text-lg leading-tight text-[var(--muted)]">Parks<br />& trails</p>
          <p className="absolute left-[10%] top-[36%] text-lg text-[#52738a]">Waterfronts</p>
        </div>

        {placeClusters.map((cluster) => {
          const isSelected = cluster.places.some((place) => place.id === selected?.id);
          const isSaved = cluster.places.some((place) => savedPlaceIds.includes(place.id));
          const clusterName = cluster.places.length === 1 ? cluster.primaryPlace.name : `${cluster.label}, ${cluster.places.length} places`;
          return (
            <button
              key={cluster.id}
              type="button"
              className={cx(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                isSelected ? "z-20 scale-110" : "z-10 hover:scale-105",
              )}
              style={{ left: `${cluster.position.left}%`, top: `${cluster.position.top}%` }}
              aria-label={`Select ${clusterName}, ${cluster.photoCount} photo${cluster.photoCount === 1 ? "" : "s"}`}
              title={`${clusterName} · ${cluster.photoCount} photo${cluster.photoCount === 1 ? "" : "s"}`}
              onClick={() => onSelectPlace?.(cluster.primaryPlace.id)}
            >
              <span
                className={cx(
                  "grid h-11 min-w-11 place-items-center rounded-full px-3 text-base font-semibold shadow-[0_6px_14px_rgba(39,34,27,0.22)] ring-2 ring-white",
                  isSelected ? "bg-[var(--gold)] text-white" : isSaved ? "bg-[var(--moss)] text-white" : "bg-[var(--moss)] text-white",
                )}
              >
                {cluster.photoCount}
              </span>
            </button>
          );
        })}
      </div>

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
