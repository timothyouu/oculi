"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MapPin, Search, UserRound } from "lucide-react";
import { isOptimizerAllowedSrc } from "@/lib/image-attribution";
import { normalizeSearchText } from "../lib/search-corrections";
import { rankSearchResults } from "../lib/search-ranking";
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

export function DiscoverSearch({ places, users, onOpenPlace, onOpenProfile }: DiscoverSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("places");
  const normalizedQuery = useMemo(() => normalizeSearchText([query]), [query]);

  const placeResults = useMemo(
    () =>
      rankSearchResults({
        items: places,
        query,
        limit: 4,
        fields: [
          { weight: 5, getValue: (place) => [place.name] },
          { weight: 3, getValue: (place) => [place.fuzzyLocationLabel] },
          { weight: 2.5, getValue: (place) => [place.tags, place.bestTimes] },
          { weight: 1, getValue: (place) => [place.description] },
        ],
      }),
    [places, query],
  );

  const profileResults = useMemo(
    () =>
      rankSearchResults({
        items: users,
        query,
        limit: 4,
        fields: [
          { weight: 5, getValue: (user) => [user.name, user.username] },
          { weight: 2, getValue: (user) => [user.homeArea] },
          { weight: 1, getValue: (user) => [user.bio] },
        ],
      }),
    [query, users],
  );

  const hasQuery = normalizedQuery.length > 0;
  const activeResults = mode === "places" ? placeResults : profileResults;
  const modeLabel = mode === "places" ? "places" : "profiles";
  const activePlaceholder =
    mode === "places" ? "Search places by name, mood, light, or location" : "Search profiles by name, handle, or bio";

  const submitFirstResult = () => {
    if (!hasQuery) return;

    const first = activeResults[0];
    if (!first) return;
    if (mode === "places") onOpenPlace((first as Place).id);
    else onOpenProfile((first as User).id);
  };

  return (
    <section className="mx-auto w-full max-w-[760px]" aria-label="Search places and profiles">
      <div className="space-y-3">
        <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,248,0.9)] p-2 shadow-[0_10px_28px_rgba(39,34,27,0.05)] transition focus-within:border-[var(--moss)] focus-within:bg-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex shrink-0 rounded-[18px] bg-[var(--chip)] p-1" aria-label="Choose what search looks through">
              {(["places", "profiles"] as SearchMode[]).map((item) => {
                const isActive = mode === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isActive}
                    className={cx(
                      "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-semibold outline-none transition sm:min-w-[112px]",
                      isActive ? "bg-[var(--paper-strong)] text-[var(--moss)] shadow-sm" : "text-[var(--ink)]/70 hover:bg-white/70",
                    )}
                    onClick={() => setMode(item)}
                  >
                    {item === "places" ? <MapPin className="size-4" aria-hidden="true" /> : <UserRound className="size-4" aria-hidden="true" />}
                    {item === "places" ? "Places" : "Profiles"}
                  </button>
                );
              })}
            </div>

            <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-[16px] px-3">
              <Search className="size-5 shrink-0 text-[var(--ink)]/70" aria-hidden="true" />
              <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--moss)] sm:block">
                Search {modeLabel}
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitFirstResult();
                }}
                className="min-w-0 flex-1 border-0 bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                style={{ outline: "none" }}
                placeholder={activePlaceholder}
                aria-label={`Search ${modeLabel}`}
              />
            </div>
          </div>
        </div>

        {hasQuery ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              <span>{mode === "places" ? "Place results" : "Profile results"}</span>
              <span>{activeResults.length ? `${activeResults.length} shown` : "No matches"}</span>
            </div>
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
                      <Image
                        src={place.coverPhotoUrl}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized={!isOptimizerAllowedSrc(place.coverPhotoUrl)}
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
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
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      width={44}
                      height={44}
                      unoptimized={!isOptimizerAllowedSrc(user.avatarUrl)}
                      className="size-11 shrink-0 rounded-full object-cover"
                    />
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
          </div>
        ) : null}

        {hasQuery && !activeResults.length ? (
          <p className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] px-3 py-2 text-sm text-[var(--muted)]">No {mode} found for {query.trim()}.</p>
        ) : null}
      </div>
    </section>
  );
}
