"use client";

import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
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
      <div className="space-y-5">
        <BackButton label="Back" fallbackHref="/" />
        <SavedPanel
          savedPlaces={savedPlaces}
          savedPhotos={savedPhotos}
          onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
          onToggleSaved={toggleSavedPlace}
        />
      </div>
    </AppShell>
  );
}
