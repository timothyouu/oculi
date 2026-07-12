"use client";

import { Bookmark, Clock, MapPin, Sparkles } from "lucide-react";
import type { Place } from "../lib/types";
import { ResilientImage } from "./resilient-image";

type PlaceCardProps = {
  place: Place;
  rank?: number;
  isSaved?: boolean;
  compact?: boolean;
  reason?: string;
  onOpenPlace?: (placeId: string) => void;
  onToggleSaved?: (placeId: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PlaceCard({ place, rank, isSaved = false, compact = false, reason, onOpenPlace, onToggleSaved }: PlaceCardProps) {
  return (
    <article className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        className="group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-950"
        onClick={() => onOpenPlace?.(place.id)}
      >
        <div className="relative">
          <ResilientImage
            src={place.coverPhotoUrl}
            alt={`${place.name} photo spot`}
            className={cx("w-full bg-zinc-100 object-cover transition duration-300 group-hover:scale-[1.02]", compact ? "aspect-[5/3]" : "aspect-[4/3]")}
          />
          {rank ? (
            <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-zinc-950 shadow-sm">
              #{rank}
            </span>
          ) : null}
        </div>
      </button>
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            onClick={() => onOpenPlace?.(place.id)}
          >
            <h3 className="truncate text-sm font-semibold text-zinc-950">{place.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{place.fuzzyLocationLabel}</span>
            </p>
          </button>
          <button
            type="button"
            className={cx(
              "shrink-0 rounded-md p-2 outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
              isSaved ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50",
            )}
            aria-label={isSaved ? `Unsave ${place.name}` : `Save ${place.name}`}
            onClick={() => onToggleSaved?.(place.id)}
          >
            <Bookmark className={cx("size-4", isSaved && "fill-current")} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {place.tags.slice(0, compact ? 2 : 4).map((tag) => (
            <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
              {tag}
            </span>
          ))}
        </div>

        {!compact ? (
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
            <div className="rounded-md bg-zinc-50 p-2">
              <span className="flex items-center gap-1 font-semibold text-zinc-900">
                <Bookmark className="size-3.5" aria-hidden="true" />
                {place.saveCount}
              </span>
              saves
            </div>
            <div className="rounded-md bg-zinc-50 p-2">
              <span className="flex items-center gap-1 font-semibold text-zinc-900">
                <Clock className="size-3.5" aria-hidden="true" />
                {place.bestTimes[0] || "Anytime"}
              </span>
              best time
            </div>
          </div>
        ) : null}

        {reason || place.timCurated ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
            <Sparkles className="size-3.5 text-zinc-900" aria-hidden="true" />
            {reason || "Curated top spot"}
          </p>
        ) : null}
      </div>
    </article>
  );
}
