"use client";

import { useState } from "react";
import { Bookmark, Grid2X2, MapPin } from "lucide-react";
import { useDemoState } from "@/lib/demo-state";
import { formatPlaceLocation } from "@/lib/location-labels";
import type { Photo, Place, User } from "../lib/types";

type ProfileSummaryProps = {
  user: User;
  photos?: Photo[];
  savedPlaces?: Place[];
  isCurrentUser?: boolean;
  isFollowed?: boolean;
  onToggleFollow?: (userId: string) => void;
  onOpenPlace?: (placeId: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ProfileSummary({
  user,
  photos = [],
  savedPlaces = [],
  isCurrentUser = false,
  isFollowed = false,
  onToggleFollow,
  onOpenPlace,
}: ProfileSummaryProps) {
  const { areas } = useDemoState();
  const [activeTab, setActiveTab] = useState<"Photos" | "Saved">("Photos");
  const [status, setStatus] = useState("");

  return (
    <section className="space-y-8">
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] p-8 shadow-[0_16px_42px_rgba(39,34,27,0.08)]">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)_170px]">
          <div className="space-y-6">
            <img
              src={user.avatarUrl}
              alt=""
              className="size-52 rounded-full bg-zinc-200 object-cover shadow-sm max-sm:size-32"
            />
            <FavoriteTags />
          </div>
          <div className="space-y-5">
            <div>
              <h1 className="text-5xl font-semibold tracking-tight text-[var(--ink)] max-sm:text-3xl">{user.name}</h1>
              <p className="mt-2 text-lg text-[var(--muted)]">{user.username}</p>
            </div>
            <p className="max-w-xl text-lg leading-7 text-[var(--ink)]/78">{user.bio}</p>
            <p className="flex items-center gap-2 text-base text-[var(--ink)]/75"><MapPin className="size-5" />{user.homeArea}</p>
            <div className="grid max-w-sm grid-cols-2 divide-x divide-[var(--line)]">
              <div>
                <p className="text-2xl font-semibold">{user.followerCount.toLocaleString()}</p>
                <p className="text-[var(--muted)]">followers</p>
              </div>
              <div className="pl-12">
                <p className="text-2xl font-semibold">{user.followingCount.toLocaleString()}</p>
                <p className="text-[var(--muted)]">following</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {!isCurrentUser ? (
              <button
                type="button"
                className={cx(
                  "inline-flex h-12 w-full items-center justify-center rounded-lg text-base outline-none transition",
                  isFollowed ? "bg-[var(--moss)] text-white" : "bg-[var(--moss)] text-white",
                )}
                onClick={() => onToggleFollow?.(user.id)}
              >
                {isFollowed ? "Following" : "Follow"}
              </button>
            ) : null}
            <button type="button" className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-white text-base" onClick={() => setStatus(isCurrentUser ? "Profile editing is mocked for the local demo." : "Profile shared to your demo clipboard.")}>
              {isCurrentUser ? "Edit profile" : "Share profile"}
            </button>
            {status ? <p className="text-sm text-[var(--moss)]">{status}</p> : null}
          </div>
        </div>
      </div>

      <div className="flex gap-16 border-b border-[var(--line)] px-1">
        {[[Grid2X2, "Photos"], [Bookmark, "Saved"]].map(([Icon, label]) => {
          const TypedIcon = Icon as typeof Grid2X2;
          return (
            <button
              key={label as string}
              type="button"
              onClick={() => setActiveTab(label as typeof activeTab)}
              className={`flex items-center gap-3 border-b-2 px-6 py-4 text-base ${activeTab === label ? "border-[var(--moss)] text-[var(--moss)]" : "border-transparent text-[var(--ink)]"}`}
            >
              <TypedIcon className="size-5" />{label as string}
            </button>
          );
        })}
      </div>

      {activeTab === "Photos" ? (
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-2">
          {photos.slice(0, 6).map((photo) => (
            <button key={photo.id} type="button" className="overflow-hidden rounded-lg" onClick={() => onOpenPlace?.(photo.placeId)}>
              <img src={photo.imageUrl} alt={photo.caption} className="aspect-[16/10] w-full object-cover max-sm:aspect-square" />
            </button>
          ))}
          {!photos.length ? <p className="col-span-full rounded-lg border border-dashed border-[var(--line)] p-6 text-[var(--muted)]">No uploaded photos yet.</p> : null}
        </div>
      ) : null}

      {activeTab === "Saved" && savedPlaces.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Saved places</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {savedPlaces.slice(0, 4).map((place) => (
              <button key={place.id} type="button" className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-4 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-left" onClick={() => onOpenPlace?.(place.id)}>
                <img src={place.coverPhotoUrl} alt="" className="aspect-[4/3] rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-base text-[var(--ink)]">{place.name}</span>
                  <span className="block truncate text-sm text-[var(--muted)]">{formatPlaceLocation(place, areas)}</span>
                </span>
                <Bookmark className="size-5 fill-[var(--gold)] text-[var(--gold)]" />
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {activeTab === "Saved" && !savedPlaces.length ? (
        <p className="rounded-lg border border-dashed border-[var(--line)] p-6 text-[var(--muted)]">No public saved places to show yet.</p>
      ) : null}
    </section>
  );
}

function FavoriteTags() {
  return (
    <div>
      <p className="mb-3 text-base font-semibold">Favorite tags</p>
      <div className="flex flex-wrap gap-3">
        {["Fog", "Bridge", "Portraits", "Golden hour"].map((tag) => (
          <span key={tag} className="rounded-full bg-[var(--chip)] px-5 py-2 text-sm text-[var(--ink)]/80">{tag}</span>
        ))}
      </div>
    </div>
  );
}
