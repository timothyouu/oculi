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
}: SavedPanelProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-500">
              <Bookmark className="size-4" aria-hidden="true" />
              Saved
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Places to shoot next</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <span className="block font-semibold text-zinc-950">{savedPlaces.length}</span>
              <span className="text-zinc-500">places</span>
            </div>
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <span className="block font-semibold text-zinc-950">{savedPhotos.length}</span>
              <span className="text-zinc-500">photos</span>
            </div>
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
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center">
          <MapPin className="mx-auto mb-3 size-8 text-zinc-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-950">No saved places yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Save a spot from the feed to build a shoot list.</p>
        </div>
      )}

      {savedPhotos.length ? (
        <section className="space-y-3" aria-label="Saved photo references">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950">
            <Camera className="size-4" aria-hidden="true" />
            Saved photo references
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {savedPhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="overflow-hidden rounded-md bg-zinc-100 text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
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
