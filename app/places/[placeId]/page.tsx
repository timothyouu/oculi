"use client";

import { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlaceDetail } from "@/components/place-detail";
import { UploadModal } from "@/components/upload-modal";
import { useDemoState } from "@/lib/demo-state";
import { topTierReason } from "@/lib/scoring";

export default function PlacePage({ params }: { params: { placeId: string } }) {
  const { photos, places, state, toggleSavedPlace, addPhoto, recordPlaceView } = useDemoState();
  const [uploadOpen, setUploadOpen] = useState(false);
  const recordedPlaceRef = useRef<string | null>(null);
  const place = places.find((item) => item.id === params.placeId);

  useEffect(() => {
    if (!place) return;
    if (recordedPlaceRef.current === place.id) return;
    recordedPlaceRef.current = place.id;
    recordPlaceView(place.id);
  }, [place, recordPlaceView]);

  if (!place) notFound();

  return (
    <AppShell>
      <>
        <PlaceDetail
          place={place}
          photos={photos.filter((photo) => photo.placeId === place.id)}
          savedPlaceIds={state.savedPlaceIds}
          topReason={topTierReason(place)}
          onToggleSaved={toggleSavedPlace}
          onOpenUpload={() => setUploadOpen(true)}
        />
        <UploadModal
          open={uploadOpen}
          places={places}
          initialPlaceId={place.id}
          onClose={() => setUploadOpen(false)}
          onSubmit={(input) => {
            addPhoto({
              placeId: input.placeId,
              imageUrl: input.previewUrl,
              file: input.file,
              caption: input.caption,
              metadataText: input.metadataText,
              shotAtTimeOfDay: input.bestLight,
              tags: input.tags,
              locationLabel: places.find((item) => item.id === input.placeId)?.name ?? place.name
            });
          }}
        />
      </>
    </AppShell>
  );
}
