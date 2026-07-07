"use client";

import { AppShell } from "@/components/app-shell";
import { SavedPanel } from "@/components/saved-panel";
import { places } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";

export default function SavedPage() {
  const { state, photos } = useDemoState();
  const savedPlaces = places.filter((place) => state.savedPlaceIds.includes(place.id));
  const savedPhotos = photos.filter((photo) => state.savedPlaceIds.includes(photo.placeId));

  return (
    <AppShell>
      <SavedPanel savedPlaces={savedPlaces} savedPhotos={savedPhotos} />
    </AppShell>
  );
}
