"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Images, Send } from "lucide-react";
import type { Photo, Place } from "@/lib/types";
import { ResilientImage } from "./resilient-image";

type SelectedPlaceCardProps = {
  place: Place;
  photos?: Photo[];
  isSaved?: boolean;
  onToggleSaved?: (placeId: string) => void;
  onOpenPlace?: (placeId: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatPhotoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function photoStatus(photo: Photo, index: number) {
  if (index === 0) return "selected";
  if (photo.metadataText?.toLowerCase().includes("raw")) return "raw";
  if (photo.likeCount > 40) return "edited";
  return "candidate";
}

export function SelectedPlaceCard({
  place,
  photos = [],
  isSaved = false,
  onToggleSaved,
  onOpenPlace,
}: SelectedPlaceCardProps) {
  const [view, setView] = useState<"overview" | "gallery">("overview");
  const placePhotos = useMemo(
    () => photos.filter((photo) => photo.placeId === place.id),
    [photos, place.id],
  );
  const photoCount = placePhotos.length;
  const visiblePhotos = placePhotos.slice(0, 6);

  useEffect(() => {
    setView("overview");
  }, [place.id]);

  if (view === "gallery") {
    return (
      <div className="flex max-h-[min(620px,calc(100vh-4rem))] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]"
            aria-label={`Back to ${place.name}`}
            onClick={() => setView("overview")}
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-semibold text-[var(--ink)]">Photos</h3>
            <p className="truncate text-sm text-[var(--muted)]">
              {photoCount} photo{photoCount === 1 ? "" : "s"} in {place.name}
            </p>
          </div>
        </div>

        <div className="min-h-0 space-y-2 overflow-y-auto p-3">
          {visiblePhotos.length ? (
            visiblePhotos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-[var(--line)] hover:bg-white"
              >
                <ResilientImage
                  src={photo.imageUrl}
                  alt={photo.caption}
                  fallbackSrc={place.coverPhotoUrl}
                  className="size-16 shrink-0 rounded-lg bg-[var(--chip)] object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-[var(--ink)]">
                    {photo.caption || `Photo ${index + 1}`}
                  </span>
                  <span className="mt-1 block truncate text-sm text-[var(--muted)]">
                    IMG_{String(index + 4821).padStart(4, "0")}.jpg · {formatPhotoDate(photo.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] text-[var(--muted)]">
                  {photoStatus(photo, index)}
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm text-[var(--muted)]">
              No photos match the current filters for this area.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <ResilientImage src={place.coverPhotoUrl} alt="" className="aspect-[16/9] w-full object-cover" />
        <button
          type="button"
          className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/55 bg-[rgba(29,29,27,0.72)] px-3 py-2 text-sm text-white shadow-[0_8px_20px_rgba(29,29,27,0.24)] backdrop-blur"
          aria-label={`Show ${photoCount} photo${photoCount === 1 ? "" : "s"} from ${place.name}`}
          onClick={() => setView("gallery")}
        >
          <Images className="size-4" aria-hidden="true" />
          {photoCount} photo{photoCount === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          className="absolute right-4 top-0 grid size-11 place-items-center rounded-b-lg bg-[var(--gold)] text-white"
          aria-label={isSaved ? `Unsave ${place.name}` : `Save ${place.name}`}
          onClick={() => onToggleSaved?.(place.id)}
        >
          <Bookmark className={cx("size-5", isSaved && "fill-current")} />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-semibold text-[var(--ink)]">{place.name}</h3>
          <p className="truncate text-base text-[var(--muted)]">{place.fuzzyLocationLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {place.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--ink)]">
              {tag}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
          <Bookmark className="size-4" aria-hidden="true" />
          {place.saveCount} saves
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-3">
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--moss)] text-base text-white"
            onClick={() => onOpenPlace?.(place.id)}
          >
            Open place
          </button>
          <button type="button" className="grid size-12 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]">
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </>
  );
}
