"use client";

import { AppShell } from "@/components/app-shell";
import { PhotoFeed } from "@/components/photo-feed";
import { PlaceCard } from "@/components/place-card";
import { StylizedMap } from "@/components/stylized-map";
import { places, users } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import { sortTopPlaces } from "@/lib/scoring";

export default function HomePage() {
  const { photos, state, toggleFollowUser } = useDemoState();
  const topPlaces = sortTopPlaces(places);
  const recommended = users.filter((user) => user.id !== "user-tim").slice(0, 3);

  return (
    <AppShell>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section>
          <div className="mb-5 rounded-lg border border-line bg-white p-4 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-wide text-moss">Photo feed first</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Find the next place worth shooting.</h1>
            <p className="mt-2 max-w-2xl text-ink/65">Browse real-looking shots, save top locations, follow photographers, and upload a local demo photo with place metadata.</p>
          </div>
          <PhotoFeed photos={photos} />
        </section>
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h2 className="mb-3 font-semibold">Top SF places</h2>
            <div className="space-y-3">
              {topPlaces.slice(0, 5).map((place, index) => <PlaceCard key={place.id} place={place} rank={index + 1} />)}
            </div>
          </section>
          <StylizedMap places={topPlaces} />
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h2 className="font-semibold">Friend-first discovery</h2>
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
                    <button onClick={() => toggleFollowUser(user.id)} className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-paper">
                      {followed ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
