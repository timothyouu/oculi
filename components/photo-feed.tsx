"use client";

import type { Photo, Place, User } from "../lib/types";
import { useRouter } from "next/navigation";
import { useDemoState } from "@/lib/demo-state";
import { PhotoCard } from "./photo-card";

type PhotoFeedProps = {
  photos: Photo[];
  placesById?: Record<string, Place | undefined>;
  usersById?: Record<string, User | undefined>;
  followedUserIds?: string[];
  likedPhotoIds?: string[];
  emptyLabel?: string;
  onToggleFollow?: (userId: string) => void;
  onTogglePhotoLike?: (photoId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  onOpenProfile?: (userId: string) => void;
};

export function PhotoFeed({
  photos,
  placesById,
  usersById,
  followedUserIds,
  likedPhotoIds,
  emptyLabel = "No photos yet. Add the first Oculi post.",
  onToggleFollow,
  onTogglePhotoLike,
  onOpenPlace,
  onOpenProfile,
}: PhotoFeedProps) {
  const demo = useDemoState();
  const router = useRouter();
  const resolvedPlacesById = placesById ?? Object.fromEntries(demo.places.map((place) => [place.id, place]));
  const resolvedUsersById = usersById ?? Object.fromEntries(demo.users.map((user) => [user.id, user]));
  const resolvedFollowedUserIds = followedUserIds ?? demo.followedUserIds;
  const resolvedLikedPhotoIds = likedPhotoIds ?? demo.likedPhotoIds;
  if (!photos.length) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
      {photos.map((photo) => {
        const place = resolvedPlacesById[photo.placeId];
        const photographer = resolvedUsersById[photo.userId];
        if (!place || !photographer) return null;

        return (
          <PhotoCard
            key={photo.id}
            photo={photo}
            place={place}
            photographer={photographer}
            isFollowed={resolvedFollowedUserIds.includes(photographer.id)}
            isCurrentUser={photographer.id === demo.currentUserId}
            isLiked={resolvedLikedPhotoIds.includes(photo.id)}
            onToggleFollow={onToggleFollow ?? demo.toggleFollowUser}
            onTogglePhotoLike={onTogglePhotoLike ?? demo.togglePhotoLike}
            onOpenPlace={
              onOpenPlace ??
              ((placeId) => {
                demo.recordPlaceView(placeId);
                router.push(`/places/${placeId}`);
              })
            }
            onOpenProfile={onOpenProfile ?? ((userId) => router.push(`/profile/${userId}`))}
          />
        );
      })}
    </div>
  );
}
