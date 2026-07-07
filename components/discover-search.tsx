"use client";

import { useMemo, useState } from "react";
import { Map, MapPin, Search, UserRound } from "lucide-react";
import type { Place, User } from "../lib/types";

type DiscoverSearchProps = {
  places: Place[];
  users: User[];
  onOpenPlace: (placeId: string) => void;
  onOpenProfile: (userId: string) => void;
  onOpenMap: () => void;
};

type SearchMode = "places" | "profiles";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DiscoverSearch({ places, users, onOpenPlace, onOpenProfile, onOpenMap }: DiscoverSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("places");
  const normalizedQuery = query.trim().toLowerCase();

  const placeResults = useMemo(
    () =>
      places
        .filter((place) => {
          if (!normalizedQuery) return true;
          return [place.name, place.fuzzyLocationLabel, place.description, ...place.tags]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .slice(0, 4),
    [normalizedQuery, places],
  );

  const profileResults = useMemo(
    () =>
      users
        .filter((user) => {
          if (!normalizedQuery) return true;
          return [user.name, user.username, user.bio, user.homeArea].join(" ").toLowerCase().includes(normalizedQuery);
        })
        .slice(0, 4),
    [normalizedQuery, users],
  );

  const hasQuery = query.trim().length > 0;
  const activeResults = mode === "places" ? placeResults : profileResults;

  const submitFirstResult = () => {
    const first = activeResults[0];
    if (!first) return;
    if (mode === "places") onOpenPlace((first as Place).id);
    else onOpenProfile((first as User).id);
  };

  return (
    <section className="mx-auto w-full max-w-4xl" aria-label="Search places and profiles">
      <div className="rounded-md border border-line bg-white p-3 shadow-soft sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitFirstResult();
              }}
              className="h-12 w-full rounded-md border border-line bg-paper pl-10 pr-3 text-sm font-medium text-ink outline-none transition placeholder:text-ink/42 focus:border-ink focus:bg-white"
              placeholder="Search places or profiles"
              aria-label="Search places or profiles"
            />
          </div>

          <div className="flex items-center gap-2">
            {(["places", "profiles"] as SearchMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={cx(
                  "h-10 rounded-md px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
                  mode === item ? "bg-ink text-white" : "border border-line bg-white text-ink/62 hover:bg-paper hover:text-ink",
                )}
                onClick={() => setMode(item)}
              >
                {item === "places" ? "Places" : "Profiles"}
              </button>
            ))}
            <button
              type="button"
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink/70 outline-none transition hover:bg-paper hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 lg:ml-0"
              onClick={onOpenMap}
            >
              <Map className="size-4" aria-hidden="true" />
              Map
            </button>
          </div>
        </div>

        {hasQuery ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {activeResults.map((item) => {
              if (mode === "places") {
                const place = item as Place;
                return (
                  <button
                    key={place.id}
                    type="button"
                    className="flex min-w-0 items-center gap-3 rounded-md bg-paper p-2 text-left outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                    onClick={() => onOpenPlace(place.id)}
                  >
                    <img src={place.coverPhotoUrl} alt="" className="size-11 rounded-md object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{place.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-ink/54">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        {place.fuzzyLocationLabel}
                      </span>
                    </span>
                  </button>
                );
              }

              const user = item as User;
              return (
                <button
                  key={user.id}
                  type="button"
                  className="flex min-w-0 items-center gap-3 rounded-md bg-paper p-2 text-left outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                  onClick={() => onOpenProfile(user.id)}
                >
                  <img src={user.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-ink/54">
                      <UserRound className="size-3 shrink-0" aria-hidden="true" />
                      {user.username}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {hasQuery && !activeResults.length ? (
          <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm text-ink/58">No {mode} found for {query.trim()}.</p>
        ) : null}
      </div>
    </section>
  );
}
