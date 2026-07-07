"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlaceCard } from "@/components/place-card";
import { StylizedMap } from "@/components/stylized-map";
import { places } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import { sortTopPlaces } from "@/lib/scoring";

export default function MapPage() {
  const router = useRouter();
  const { state, toggleSavedPlace } = useDemoState();
  const topPlaces = sortTopPlaces(places);
  const [selectedPlaceId, setSelectedPlaceId] = useState(topPlaces[0]?.id);

  return (
    <AppShell activeItem="map">
      <div className="space-y-5">
        <section className="rounded-md border border-line bg-white p-4 shadow-soft sm:p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">Map</p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">Explore Oculi spots by place.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
                Browse the San Francisco photo map without cluttering the Discover swipe flow.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <StylizedMap
            places={topPlaces}
            selectedPlaceId={selectedPlaceId}
            savedPlaceIds={state.savedPlaceIds}
            onSelectPlace={setSelectedPlaceId}
            onToggleSaved={toggleSavedPlace}
            className="lg:sticky lg:top-20"
          />

          <aside className="space-y-3" aria-label="Mapped places">
            {topPlaces.slice(0, 6).map((place, index) => (
              <PlaceCard
                key={place.id}
                place={place}
                rank={index + 1}
                isSaved={state.savedPlaceIds.includes(place.id)}
                compact
                onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
                onToggleSaved={toggleSavedPlace}
              />
            ))}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
