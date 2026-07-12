"use client";

import { useEffect, useState } from "react";
import { Bookmark, Car, Footprints, Map, MapPin, Route, Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDemoState } from "@/lib/demo-state";
import { kmToMiles, haversineDistanceKm } from "@/lib/geo";
import { formatPlaceLocation } from "@/lib/location-labels";
import { accessibilityForPlace } from "@/lib/place-accessibility";
import { sceneLabelsFor } from "@/lib/place-taxonomy";
import { attributionForImageUrl } from "@/lib/image-attribution";
import type { Photo, Place } from "../lib/types";
import { BackButton } from "./back-button";
import { MapboxMap } from "./mapbox-map";
import { PhotoCard } from "./photo-card";
import { ResilientImage } from "./resilient-image";
import { SharePlaceButton } from "./share-place-button";

type PlaceDetailProps = {
  place: Place;
  photos: Photo[];
  savedPlaceIds?: string[];
  topReason?: string;
  onToggleSaved?: (placeId: string) => void;
  onOpenUpload?: (placeId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  onOpenProfile?: (userId: string) => void;
  showBackButton?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PlaceDetail({
  place,
  photos,
  savedPlaceIds = [],
  onToggleSaved,
  onOpenUpload,
  onOpenPlace,
  onOpenProfile,
  showBackButton = true,
}: PlaceDetailProps) {
  const router = useRouter();
  const [actionStatus, setActionStatus] = useState("");
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const {
    followedUserIds,
    likedPhotoIds,
    toggleFollowUser,
    togglePhotoLike,
    currentUserId,
    areas,
    users,
  } = useDemoState();
  const isSaved = savedPlaceIds.includes(place.id);
  const heroPhotos = photos.slice(0, 4);
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));
  const placeLocation = formatPlaceLocation(place, areas);
  const heroImageUrl = heroPhotos[0]?.imageUrl || place.coverPhotoUrl;
  const heroAttribution = attributionForImageUrl(heroImageUrl);

  // Real distance-to-place (docs/demo-to-product-audit.md item 7), replacing
  // the previously-hardcoded "0.3 mi". Same geolocation pattern already used
  // by the map's "Near me" button (app/map/page.tsx `handleNearMe`): ask for
  // the visitor's position and compute the real haversine distance. Falls
  // back to hiding the stat entirely (never a fabricated number) when
  // geolocation is unavailable/denied/unsupported.
  useEffect(() => {
    setDistanceMiles(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const distanceKm = haversineDistanceKm(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          { lat: place.lat, lng: place.lng },
        );
        setDistanceMiles(kmToMiles(distanceKm));
      },
      () => {
        // Permission denied or unavailable -- leave distanceMiles null so
        // the stat is simply omitted, never a fake placeholder.
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );

    return () => {
      cancelled = true;
    };
  }, [place.id, place.lat, place.lng]);

  return (
    <article className="space-y-7">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_440px]">
        <div className="space-y-6">
          {showBackButton ? <BackButton label="Back" fallbackHref="/" /> : null}
          <div className="relative overflow-hidden rounded-[12px]">
            <ResilientImage
              src={heroImageUrl}
              alt={`${place.name} hero photo`}
              className="aspect-[16/9] w-full object-cover max-sm:aspect-[4/3]"
              priority
            />
            {isSaved ? (
              <span className="absolute right-4 top-0 grid h-20 w-12 place-items-center rounded-b bg-[var(--gold)] text-white">
                <Bookmark className="size-6 fill-current" />
              </span>
            ) : null}
          </div>
          {heroAttribution ? (
            <p className="text-xs text-[var(--ink)]/50">
              <a
                href={heroAttribution.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-[var(--ink)]/80"
              >
                {heroAttribution.label}
              </a>
            </p>
          ) : null}
        </div>

        <aside className="space-y-5 lg:pt-14">
          <div className="flex justify-end">{place.timCurated ? <span className="rounded-md bg-orange-100 px-3 py-1 text-sm text-orange-800">Curated</span> : null}</div>
          <div>
            <h1 className="text-5xl font-semibold leading-tight tracking-tight text-[var(--ink)] max-sm:text-4xl">{place.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-lg text-[var(--ink)]/80"><MapPin className="size-5" />{placeLocation}</p>
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
              <SharePlaceButton
                place={place}
                icon={<Share className="size-5" />}
                onStatusChange={(message) => setActionStatus(message ?? "")}
                className="grid size-14 place-items-center rounded-lg border border-[var(--line)] bg-white"
              />
              <button
                type="button"
                className="grid size-14 place-items-center rounded-lg border border-[var(--line)] bg-white"
                aria-label={`Add ${place.name} to your shoot-day route`}
                onClick={() => {
                  if (!isSaved) onToggleSaved?.(place.id);
                  setActionStatus(
                    isSaved
                      ? "Already in your shoot-day route options — open Saved to build your route."
                      : "Added to your shoot-day route options — open Saved to build your route.",
                  );
                }}
              >
                <Route className="size-5" aria-hidden="true" />
              </button>
          </div>
          {actionStatus ? <p className="text-sm text-[var(--moss)]">{actionStatus}</p> : null}
          <div className="grid grid-cols-2 gap-2 border-y border-[var(--line)] py-4 text-sm text-[var(--muted)] sm:grid-cols-3">
            <span className="flex items-center gap-2"><Bookmark className="size-4" />{place.saveCount} saves</span>
            <span className="flex items-center gap-2"><Car className="size-4" />{accessibilityForPlace(place)}</span>
            {distanceMiles !== null ? (
              <span className="flex items-center gap-2">
                <Footprints className="size-4" />
                {distanceMiles < 10 ? distanceMiles.toFixed(1) : Math.round(distanceMiles)} mi
              </span>
            ) : null}
          </div>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Shoot notes</h2>
            <div className="rounded-[10px] border border-[var(--line)] bg-white/70 p-4">
              <p className="leading-7 text-[var(--ink)]/80">{place.description}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="grid gap-1 sm:grid-cols-[92px_minmax(0,1fr)]">
                  <dt className="font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Best light</dt>
                  <dd className="text-[var(--ink)]">{place.bestTimes.slice(0, 3).join(" · ")}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[92px_minmax(0,1fr)]">
                  <dt className="font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Scene</dt>
                  <dd className="text-[var(--ink)]">{sceneLabelsFor(place).join(" · ")}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[92px_minmax(0,1fr)]">
                  <dt className="font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Ease of visit</dt>
                  <dd className="text-[var(--ink)]">{accessibilityForPlace(place)}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[92px_minmax(0,1fr)]">
                  <dt className="font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Good for</dt>
                  <dd className="text-[var(--ink)]/80">{place.tags.join(" · ")}</dd>
                </div>
              </dl>
            </div>
          </section>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[#e7ece5]">
            <MapboxMap
              places={[place]}
              photos={photos}
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

      <section className="space-y-3" aria-label={`Photos from ${place.name}`}>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Photos here</h2>
          <button type="button" className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-[var(--moss)] px-4 text-sm text-white" onClick={() => onOpenUpload?.(place.id)}>
            Add photo
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {photos.map((photo, index) => {
            const photographer = usersById[photo.userId];
            if (!photographer) return null;

            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                place={place}
                photographer={photographer}
                isFollowed={followedUserIds.includes(photographer.id)}
                isCurrentUser={photographer.id === currentUserId}
                isLiked={likedPhotoIds.includes(photo.id)}
                priority={index === 0}
                onToggleFollow={toggleFollowUser}
                onTogglePhotoLike={togglePhotoLike}
                onOpenPlace={onOpenPlace ?? ((placeId) => router.push(`/places/${placeId}`))}
                onOpenProfile={onOpenProfile ?? ((userId) => router.push(`/profile/${userId}`))}
              />
            );
          })}
        </div>
      </section>
    </article>
  );
}
