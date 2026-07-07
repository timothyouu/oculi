"use client";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlaceDetail } from "@/components/place-detail";
import { places } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import { topTierReason } from "@/lib/scoring";

export default function PlacePage({ params }: { params: { placeId: string } }) {
  const { photos, state, toggleSavedPlace } = useDemoState();
  const place = places.find((item) => item.id === params.placeId);
  if (!place) notFound();

  return (
    <AppShell>
      <PlaceDetail
        place={place}
        photos={photos.filter((photo) => photo.placeId === place.id)}
        savedPlaceIds={state.savedPlaceIds}
        topReason={topTierReason(place)}
        onToggleSaved={toggleSavedPlace}
      />
    </AppShell>
  );
}
