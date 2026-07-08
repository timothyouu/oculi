"use client";

import { AppShell } from "@/components/app-shell";
import { DiscoverDeck } from "@/components/discover-deck";
import { DiscoverSearch } from "@/components/discover-search";
import { places, users } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const demo = useDemoState();
  const { photos, state, toggleSavedPlace } = demo;
  const placesById = Object.fromEntries(places.map((place) => [place.id, place]));
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));

  return (
    <AppShell>
      <div className="space-y-5">
        <DiscoverSearch
          places={places}
          users={users.filter((user) => user.id !== "user-tim")}
          onOpenPlace={(placeId) => {
            demo.recordPlaceView(placeId);
            router.push(`/places/${placeId}`);
          }}
          onOpenProfile={(userId) => router.push(`/profile/${userId}`)}
          onOpenMap={() => router.push("/map")}
        />
        <DiscoverDeck
          photos={photos}
          placesById={placesById}
          usersById={usersById}
          savedPlaceIds={state.savedPlaceIds}
          followedUserIds={state.followedUserIds}
          resumePlaceId={state.lastDiscoveryPlaceId}
          resumeIndex={state.discoveryActiveIndex}
          canResume={demo.hasLoadedRemoteState}
          onViewPlace={demo.recordPlaceView}
          onToggleSaved={toggleSavedPlace}
          onOpenPlace={(placeId) => {
            demo.recordPlaceView(placeId);
            router.push(`/places/${placeId}`);
          }}
          onOpenProfile={(userId) => router.push(`/profile/${userId}`)}
        />
      </div>
    </AppShell>
  );
}
