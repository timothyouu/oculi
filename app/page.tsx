"use client";

import { AppShell } from "@/components/app-shell";
import { DiscoverDeck } from "@/components/discover-deck";
import { DiscoverSearch } from "@/components/discover-search";
import { useDemoState } from "@/lib/demo-state";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const demo = useDemoState();
  const { currentUserId, photos, places, state, toggleSavedPlace, users } = demo;
  const placesById = Object.fromEntries(places.map((place) => [place.id, place]));
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));

  return (
    <AppShell>
      <div className="space-y-5">
        <DiscoverSearch
          places={places}
          users={users.filter((user) => user.id !== currentUserId)}
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
