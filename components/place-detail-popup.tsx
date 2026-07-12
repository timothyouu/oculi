"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { useDemoState } from "@/lib/demo-state";
import { topTierReason } from "@/lib/scoring";
import { PlaceDetail } from "./place-detail";
import { UploadModal } from "./upload-modal";

type PlaceDetailPopupProps = {
  placeId: string | null;
  onClose: () => void;
  onOpenPlace?: (placeId: string) => void;
};

export function PlaceDetailPopup({ placeId, onClose, onOpenPlace }: PlaceDetailPopupProps) {
  const { photos, places, state, toggleSavedPlace, addPhoto } = useDemoState();
  const [uploadOpen, setUploadOpen] = useState(false);
  const place = places.find((item) => item.id === placeId);

  useEffect(() => {
    if (!placeId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, placeId]);

  useEffect(() => {
    if (!placeId) setUploadOpen(false);
  }, [placeId]);

  if (!place) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(29,29,27,0.42)] px-4 py-5 backdrop-blur-sm sm:px-6 lg:px-8" role="presentation">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close place details"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-detail-popup-title"
        className="relative mx-auto flex max-h-[calc(100vh-2.5rem)] max-w-6xl flex-col overflow-hidden rounded-[14px] border border-white/70 bg-[var(--paper)] shadow-[0_30px_90px_rgba(29,29,27,0.28)]"
      >
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--line)] bg-[rgba(255,253,248,0.94)] px-4 py-3 backdrop-blur sm:px-5">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] shadow-sm transition hover:bg-[var(--chip)]"
            onClick={onClose}
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Place details</p>
            <h2 id="place-detail-popup-title" className="truncate text-lg font-semibold text-[var(--ink)]">
              {place.name}
            </h2>
          </div>
          <button
            type="button"
            className="ml-auto grid size-10 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)] shadow-sm transition hover:bg-[var(--chip)]"
            aria-label="Close place details"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <PlaceDetail
            place={place}
            photos={photos.filter((photo) => photo.placeId === place.id)}
            savedPlaceIds={state.savedPlaceIds}
            topReason={topTierReason(place)}
            onToggleSaved={toggleSavedPlace}
            onOpenUpload={() => setUploadOpen(true)}
            onOpenPlace={onOpenPlace}
            showBackButton={false}
          />
        </div>
      </section>
      <UploadModal
        open={uploadOpen}
        places={places}
        initialPlaceId={place.id}
        onClose={() => setUploadOpen(false)}
        onSubmit={(input) => {
          return addPhoto({
            placeId: input.placeId,
            imageUrl: input.previewUrl,
            file: input.file,
            caption: input.caption,
            metadataText: input.metadataText,
            shotAtTimeOfDay: input.bestLight,
            tags: input.tags,
            locationLabel: places.find((item) => item.id === input.placeId)?.name ?? place.name,
          });
        }}
      />
    </div>
  );
}
