"use client";

import { AppShell } from "@/components/app-shell";
import { SavedPanel } from "@/components/saved-panel";
import { places } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import { useRouter } from "next/navigation";

export default function SavedPage() {
  const router = useRouter();
  const { state, photos, toggleSavedPlace } = useDemoState();
  const savedPlaces = places.filter((place) => state.savedPlaceIds.includes(place.id));
  const savedPhotos = photos.filter((photo) => state.savedPlaceIds.includes(photo.placeId));

  return (
    <AppShell activeItem="saved">
      <SavedPanel
        savedPlaces={savedPlaces}
        savedPhotos={savedPhotos}
        onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
        onToggleSaved={toggleSavedPlace}
      />
    </AppShell>
  );
}
