"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, UserRound } from "lucide-react";
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
    <section className="mx-auto w-full max-w-[760px]" aria-label="Search places and profiles">
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[var(--ink)]/70" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitFirstResult();
              }}
              className="h-[58px] w-full rounded-[22px] border border-[var(--line)] bg-[rgba(255,253,248,0.9)] pl-14 pr-5 text-lg text-[var(--ink)] shadow-[0_10px_28px_rgba(39,34,27,0.05)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--moss)] focus:bg-white"
              placeholder="Search places or profiles"
              aria-label="Search places or profiles"
            />
          </div>

          <div className="grid grid-cols-2 rounded-[18px] border border-[var(--line)] bg-[rgba(255,253,248,0.72)] p-1">
            {(["places", "profiles"] as SearchMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={cx(
                  "inline-flex h-12 items-center justify-center gap-3 rounded-[14px] px-4 text-lg outline-none transition",
                  mode === item ? "bg-[var(--chip)] text-[var(--moss)] shadow-sm" : "text-[var(--ink)] hover:bg-white/60",
                )}
                onClick={() => setMode(item)}
              >
                {item === "places" ? <MapPin className="size-5" /> : <UserRound className="size-5" />}
                {item === "places" ? "Places" : "Profiles"}
              </button>
            ))}
          </div>
        </div>

        {hasQuery ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {activeResults.map((item) => {
              if (mode === "places") {
                const place = item as Place;
                return (
                  <button
                    key={place.id}
                    type="button"
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-2 text-left outline-none transition hover:bg-white"
                    onClick={() => onOpenPlace(place.id)}
                  >
                    <img src={place.coverPhotoUrl} alt="" className="size-12 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--ink)]">{place.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-[var(--muted)]">
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
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-2 text-left outline-none transition hover:bg-white"
                  onClick={() => onOpenProfile(user.id)}
                >
                  <img src={user.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--ink)]">{user.name}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-[var(--muted)]">
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
          <p className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 text-sm text-[var(--muted)]">No {mode} found for {query.trim()}.</p>
        ) : null}
      </div>
    </section>
  );
}
