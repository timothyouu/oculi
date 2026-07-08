"use client";

import { useState } from "react";
import { Bookmark, Camera, Car, Map, MapPin, MoreHorizontal, Share, Star, Footprints } from "lucide-react";
import { useRouter } from "next/navigation";
import { users } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import type { Photo, Place } from "../lib/types";
import { BackButton } from "./back-button";
import { MapboxMap } from "./mapbox-map";
import { PhotoCard } from "./photo-card";

type PlaceDetailProps = {
  place: Place;
  photos: Photo[];
  savedPlaceIds?: string[];
  topReason?: string;
  onToggleSaved?: (placeId: string) => void;
  onOpenUpload?: (placeId: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PlaceDetail({
  place,
  photos,
  savedPlaceIds = [],
  topReason,
  onToggleSaved,
  onOpenUpload,
}: PlaceDetailProps) {
  const router = useRouter();
  const [actionStatus, setActionStatus] = useState("");
  const {
    followedUserIds,
    likedPhotoIds,
    toggleFollowUser,
    togglePhotoLike,
  } = useDemoState();
  const isSaved = savedPlaceIds.includes(place.id);
  const heroPhotos = photos.slice(0, 4);
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));

  return (
    <article className="space-y-7">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_440px]">
        <div className="space-y-6">
          <BackButton label="Back" fallbackHref="/" />
          <div className="relative overflow-hidden rounded-[12px]">
            <img
              src={heroPhotos[0]?.imageUrl || place.coverPhotoUrl}
              alt={`${place.name} hero photo`}
              className="aspect-[16/9] w-full object-cover max-sm:aspect-[4/3]"
            />
            <span className="absolute right-4 top-0 grid h-20 w-12 place-items-center rounded-b bg-[var(--gold)] text-white">
              <Bookmark className="size-6 fill-current" />
            </span>
          </div>
        </div>

        <aside className="space-y-5 lg:pt-14">
          <div className="flex justify-end">{place.timCurated ? <span className="rounded-md bg-orange-100 px-3 py-1 text-sm text-orange-800">Tim-curated</span> : null}</div>
          <div>
            <h1 className="text-5xl font-semibold leading-tight tracking-tight text-[var(--ink)] max-sm:text-4xl">{place.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-lg text-[var(--ink)]/80"><MapPin className="size-5" />San Francisco, CA</p>
            <p className="mt-2 text-lg italic text-[var(--muted)]">{place.fuzzyLocationLabel}</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_56px_56px] gap-3">
              <button
                type="button"
                className={cx(
                  "inline-flex h-14 items-center justify-center gap-3 rounded-lg text-lg outline-none transition",
                  isSaved ? "bg-[var(--moss)] text-white" : "border border-[var(--line)] bg-white text-[var(--ink)]",
                )}
                onClick={() => onToggleSaved?.(place.id)}
              >
                <Bookmark className={cx("size-5", isSaved && "fill-current")} aria-hidden="true" />
                {isSaved ? "Bookmarked" : "Bookmark"}
              </button>
              <button
                type="button"
                className="grid size-14 place-items-center rounded-lg border border-[var(--line)] bg-white"
                aria-label={`Copy demo share link for ${place.name}`}
                onClick={() => setActionStatus(`Share card ready for ${place.name}.`)}
              >
                <Share className="size-5" />
              </button>
              <button
                type="button"
                className="grid size-14 place-items-center rounded-lg border border-[var(--line)] bg-white"
                aria-label={`Show more actions for ${place.name}`}
                onClick={() => setActionStatus("Added to your next shoot-day options.")}
              >
                <MoreHorizontal className="size-5" />
              </button>
          </div>
          {actionStatus ? <p className="text-sm text-[var(--moss)]">{actionStatus}</p> : null}
          <div className="grid grid-cols-4 gap-2 border-y border-[var(--line)] py-4 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-2"><Bookmark className="size-4" />{place.saveCount} saves</span>
            <span className="flex items-center gap-2"><Star className="size-4" />4.8</span>
            <span className="flex items-center gap-2"><Car className="size-4" />Easy</span>
            <span className="flex items-center gap-2"><Footprints className="size-4" />0.3 mi</span>
          </div>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Best light</h2>
            <div className="flex flex-wrap gap-3">
              {place.bestTimes.slice(0, 3).map((time) => (
                <span key={time} className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm">{time}</span>
              ))}
            </div>
            <p className="leading-7 text-[var(--ink)]/75">{place.description}</p>
            <div className="flex flex-wrap gap-2">
              {place.tags.map((tag) => (
                <span key={tag} className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)]/80">{tag}</span>
              ))}
            </div>
          </section>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[#e7ece5]">
            <MapboxMap
              places={[place]}
              selectedPlaceId={place.id}
              savedPlaceIds={savedPlaceIds}
              onSelectPlace={() => undefined}
              onToggleSaved={onToggleSaved}
              showSelectedCard={false}
              requireMapbox
              className="h-72"
            />
            <button type="button" className="flex h-14 w-full items-center justify-center gap-3 border-t border-[var(--line)] bg-[var(--paper-strong)] text-lg" onClick={() => router.push("/map")}>
              <Map className="size-5" /> Open in Map
            </button>
          </div>
        </aside>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Field notes</h2>
          <button type="button" className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--moss)] px-4 text-sm text-white" onClick={() => onOpenUpload?.(place.id)}>
            <Camera className="size-4" /> Add field note
          </button>
        </div>
        <div className="space-y-4">
          {photos.slice(0, 4).map((photo) => {
            const photographer = usersById[photo.userId];
            if (!photographer) return null;
            return (
              <div key={photo.id} className="grid grid-cols-[40px_minmax(0,1fr)_110px] gap-4 border-t border-[var(--line)] py-4 max-sm:grid-cols-[40px_minmax(0,1fr)]">
                <button onClick={() => router.push(`/profile/${photographer.id}`)}><img src={photographer.avatarUrl} alt="" className="size-9 rounded-full object-cover" /></button>
                <div>
                  <p className="font-semibold">{photographer.name} <span className="ml-2 rounded bg-orange-100 px-2 py-0.5 text-xs font-normal text-orange-800">{place.timCurated ? "Tim-curated" : ""}</span></p>
                  <p className="mt-2 max-w-2xl leading-6 text-[var(--ink)]/75">{photo.caption}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{photo.metadataText || topReason}</p>
                </div>
                <img src={photo.imageUrl} alt="" className="aspect-square rounded-lg object-cover max-sm:hidden" />
              </div>
            );
          })}
          </div>
      </section>

      <section className="space-y-3" aria-label={`Photos from ${place.name}`}>
        <h2 className="text-xl font-semibold text-[var(--ink)]">Recent photos here</h2>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {photos.map((photo) => {
            const photographer = usersById[photo.userId];
            if (!photographer) return null;

            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                place={place}
                photographer={photographer}
                isSaved={isSaved}
                isFollowed={followedUserIds.includes(photographer.id)}
                isCurrentUser={photographer.id === "user-tim"}
                isLiked={likedPhotoIds.includes(photo.id)}
                onToggleSaved={onToggleSaved}
                onToggleFollow={toggleFollowUser}
                onTogglePhotoLike={togglePhotoLike}
                onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
                onOpenProfile={(userId) => router.push(`/profile/${userId}`)}
              />
            );
          })}
        </div>
      </section>
    </article>
  );
}
