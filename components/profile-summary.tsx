"use client";

import { Camera, MapPin, UserPlus, Users } from "lucide-react";
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
  return (
    <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
      <div className="h-24 bg-[linear-gradient(135deg,#18181b,#52525b)]" />
      <div className="space-y-5 p-4 sm:p-5">
        <div className="-mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <img
              src={user.avatarUrl}
              alt=""
              className="size-24 rounded-md border-4 border-white bg-zinc-200 object-cover shadow-sm"
            />
            <div className="pb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{user.name}</h1>
              <p className="text-sm font-medium text-zinc-500">{user.username}</p>
            </div>
          </div>
          {!isCurrentUser ? (
            <button
              type="button"
              className={cx(
                "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                isFollowed ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
              )}
              onClick={() => onToggleFollow?.(user.id)}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              {isFollowed ? "Following" : "Follow"}
            </button>
          ) : null}
        </div>

        <p className="max-w-3xl text-sm leading-6 text-zinc-700">{user.bio}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-zinc-50 p-3">
            <p className="text-lg font-semibold text-zinc-950">{photos.length}</p>
            <p className="flex items-center gap-1 text-xs text-zinc-500">
              <Camera className="size-3.5" aria-hidden="true" />
              uploads
            </p>
          </div>
          <div className="rounded-md bg-zinc-50 p-3">
            <p className="text-lg font-semibold text-zinc-950">{savedPlaces.length}</p>
            <p className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="size-3.5" aria-hidden="true" />
              saved
            </p>
          </div>
          <div className="rounded-md bg-zinc-50 p-3">
            <p className="text-lg font-semibold text-zinc-950">{user.followerCount}</p>
            <p className="flex items-center gap-1 text-xs text-zinc-500">
              <Users className="size-3.5" aria-hidden="true" />
              followers
            </p>
          </div>
          <div className="rounded-md bg-zinc-50 p-3">
            <p className="text-lg font-semibold text-zinc-950">{user.followingCount}</p>
            <p className="text-xs text-zinc-500">following</p>
          </div>
        </div>

        {savedPlaces.length ? (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-950">Saved shoot list</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {savedPlaces.slice(0, 6).map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className="min-w-40 rounded-md border border-zinc-200 bg-white p-2 text-left outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                  onClick={() => onOpenPlace?.(place.id)}
                >
                  <img src={place.coverPhotoUrl} alt="" className="mb-2 aspect-[4/3] w-full rounded object-cover" />
                  <p className="truncate text-xs font-semibold text-zinc-950">{place.name}</p>
                  <p className="truncate text-[11px] text-zinc-500">{place.fuzzyLocationLabel}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
