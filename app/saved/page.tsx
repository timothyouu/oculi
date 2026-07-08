"use client";

import { AppShell } from "@/components/app-shell";
import { SavedPanel } from "@/components/saved-panel";
import { useDemoState } from "@/lib/demo-state";
import { useRouter } from "next/navigation";

export default function SavedPage() {
  const router = useRouter();
  const { state, photos, places, toggleSavedPlace } = useDemoState();
  const savedPlaces = places.filter((place) => state.savedPlaceIds.includes(place.id));
  const savedPhotos = photos.filter((photo) => state.savedPlaceIds.includes(photo.placeId));

  return (
    <AppShell activeItem="saved">
      <div className="space-y-5">
        <SavedPanel
          savedPlaces={savedPlaces}
          savedPhotos={savedPhotos}
          savedCount={state.savedPlaceIds.length}
          onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
          onToggleSaved={toggleSavedPlace}
        />
      </div>
    </AppShell>
  );
}
