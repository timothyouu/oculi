"use client";

import { AppShell } from "@/components/app-shell";
import { DiscoverDeck } from "@/components/discover-deck";
import { PlaceCard } from "@/components/place-card";
import { StylizedMap } from "@/components/stylized-map";
import { places, users } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import { sortTopPlaces } from "@/lib/scoring";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { photos, state, toggleSavedPlace, toggleFollowUser } = useDemoState();
  const topPlaces = sortTopPlaces(places);
  const recommended = users.filter((user) => user.id !== "user-tim").slice(0, 3);
  const placesById = Object.fromEntries(places.map((place) => [place.id, place]));
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));

  const rightRail = (
    <>
      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h2 className="mb-3 font-semibold">Top SF places</h2>
        <div className="space-y-3">
          {topPlaces.slice(0, 5).map((place, index) => (
            <PlaceCard
              key={place.id}
              place={place}
              rank={index + 1}
              isSaved={state.savedPlaceIds.includes(place.id)}
              onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
              onToggleSaved={toggleSavedPlace}
              compact
            />
          ))}
        </div>
      </section>
      <StylizedMap places={topPlaces} />
      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h2 className="font-semibold">Photographers to follow</h2>
        <div className="mt-3 space-y-3">
          {recommended.map((user) => {
            const followed = state.followedUserIds.includes(user.id);
            return (
              <div key={user.id} className="flex items-center gap-3">
                <img className="h-10 w-10 rounded-full object-cover" src={user.avatarUrl} alt={`${user.name} avatar`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-ink/55">{user.bio}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFollowUser(user.id)}
                  className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-paper"
                >
                  {followed ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );

  return (
    <AppShell rightRail={rightRail}>
      <DiscoverDeck
        photos={photos}
        placesById={placesById}
        usersById={usersById}
        savedPlaceIds={state.savedPlaceIds}
        onToggleSaved={toggleSavedPlace}
        onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
        onOpenProfile={(userId) => router.push(`/profile/${userId}`)}
      />
    </AppShell>
  );
}
