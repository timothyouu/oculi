"use client";

import { AppShell } from "@/components/app-shell";
import { SavedPanel } from "@/components/saved-panel";
import { useDemoState } from "@/lib/demo-state";
import { resolveItineraryPlaces } from "@/lib/itinerary";
import { useRouter } from "next/navigation";

export default function SavedPage() {
  const router = useRouter();
  const { state, photos, places, toggleSavedPlace, addToItinerary, removeFromItinerary, reorderItinerary } =
    useDemoState();
  const savedPlaces = places.filter((place) => state.savedPlaceIds.includes(place.id));
  const savedPhotos = photos.filter((photo) => state.savedPlaceIds.includes(photo.placeId));
  // Resolve against the full catalog so an itinerary stop survives even if the
  // place is later un-saved; the add picker only ever offers saved places.
  const itineraryPlaces = resolveItineraryPlaces(state.itineraryPlaceIds, places);

  return (
    <AppShell activeItem="saved">
      <div className="space-y-5">
        <SavedPanel
          savedPlaces={savedPlaces}
          savedPhotos={savedPhotos}
          savedCount={state.savedPlaceIds.length}
          itineraryPlaces={itineraryPlaces}
          onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
          onToggleSaved={toggleSavedPlace}
          onAddToItinerary={addToItinerary}
          onRemoveFromItinerary={removeFromItinerary}
          onReorderItinerary={reorderItinerary}
        />
      </div>
    </AppShell>
  );
}
