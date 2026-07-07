"use client";

import { Bookmark, Camera, MapPin } from "lucide-react";
import type { Photo, Place } from "../lib/types";
import { PlaceCard } from "./place-card";

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
  return (
    <section className="space-y-5">
      <div className="rounded-md border border-line bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-moss">
              <Bookmark className="size-4" aria-hidden="true" />
              Bookmark tab
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Places to shoot next</h1>
          </div>
          <div className="inline-flex rounded-md border border-line bg-paper p-1 text-sm font-semibold">
            <span className="rounded-md bg-ink px-3 py-2 text-white">{savedPlaces.length} places</span>
            <span className="px-3 py-2 text-ink/58">{savedPhotos.length} photo refs</span>
          </div>
        </div>
      </div>

      {savedPlaces.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {savedPlaces.map((place, index) => (
            <PlaceCard
              key={place.id}
              place={place}
              rank={index + 1}
              isSaved
              onOpenPlace={onOpenPlace}
              onToggleSaved={onToggleSaved}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line bg-white p-8 text-center shadow-soft">
          <MapPin className="mx-auto mb-3 size-8 text-moss" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink">No bookmarked places yet</h2>
          <p className="mt-1 text-sm text-ink/55">Swipe right or tap the bookmark tab on a discovery card to build a shoot list.</p>
        </div>
      )}

      {savedPhotos.length ? (
        <section className="space-y-3" aria-label="Saved photo references">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Camera className="size-4" aria-hidden="true" />
            Photo references from bookmarked places
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {savedPhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="overflow-hidden rounded-md bg-zinc-100 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                onClick={() => onOpenPlace?.(photo.placeId)}
              >
                <img src={photo.imageUrl} alt={photo.caption} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
