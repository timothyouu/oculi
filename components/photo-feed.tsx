"use client";

import type { Comment, Photo, Place, User } from "../lib/types";
import { useRouter } from "next/navigation";
import { places, users } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import { PhotoCard } from "./photo-card";

type PhotoFeedProps = {
  photos: Photo[];
  placesById?: Record<string, Place | undefined>;
  usersById?: Record<string, User | undefined>;
  commentsByPhotoId?: Record<string, Comment[] | undefined>;
  savedPlaceIds?: string[];
  followedUserIds?: string[];
  likedPhotoIds?: string[];
  likedCommentIds?: string[];
  likedReplyIds?: string[];
  emptyLabel?: string;
  onToggleSaved?: (placeId: string) => void;
  onToggleFollow?: (userId: string) => void;
  onTogglePhotoLike?: (photoId: string) => void;
  onAddComment?: (photoId: string, body: string) => void;
  onToggleCommentLike?: (commentId: string) => void;
  onAddReply?: (commentId: string, body: string) => void;
  onToggleReplyLike?: (replyId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  onOpenProfile?: (userId: string) => void;
};

export function PhotoFeed({
  photos,
  placesById,
  usersById,
  commentsByPhotoId,
  savedPlaceIds,
  followedUserIds,
  likedPhotoIds,
  likedCommentIds,
  likedReplyIds,
  emptyLabel = "No photos yet. Add the first Oculi spot.",
  onToggleSaved,
  onToggleFollow,
  onTogglePhotoLike,
  onAddComment,
  onToggleCommentLike,
  onAddReply,
  onToggleReplyLike,
  onOpenPlace,
  onOpenProfile,
}: PhotoFeedProps) {
  const demo = useDemoState();
  const router = useRouter();
  const resolvedPlacesById = placesById ?? Object.fromEntries(places.map((place) => [place.id, place]));
  const resolvedUsersById = usersById ?? Object.fromEntries(users.map((user) => [user.id, user]));
  const resolvedCommentsByPhotoId =
    commentsByPhotoId ??
    demo.comments.reduce<Record<string, Comment[]>>((acc, comment) => {
      acc[comment.photoId] = [...(acc[comment.photoId] ?? []), comment];
      return acc;
    }, {});
  const resolvedSavedPlaceIds = savedPlaceIds ?? demo.savedPlaceIds;
  const resolvedFollowedUserIds = followedUserIds ?? demo.followedUserIds;
  const resolvedLikedPhotoIds = likedPhotoIds ?? demo.likedPhotoIds;
  const resolvedLikedCommentIds = likedCommentIds ?? demo.likedCommentIds;
  const resolvedLikedReplyIds = likedReplyIds ?? demo.likedReplyIds;
  if (!photos.length) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
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
            comments={resolvedCommentsByPhotoId[photo.id] || []}
            usersById={resolvedUsersById}
            isSaved={resolvedSavedPlaceIds.includes(place.id)}
            isFollowed={resolvedFollowedUserIds.includes(photographer.id)}
            isLiked={resolvedLikedPhotoIds.includes(photo.id)}
            likedCommentIds={resolvedLikedCommentIds}
            likedReplyIds={resolvedLikedReplyIds}
            onToggleSaved={onToggleSaved ?? demo.toggleSavedPlace}
            onToggleFollow={onToggleFollow ?? demo.toggleFollowUser}
            onTogglePhotoLike={onTogglePhotoLike ?? demo.togglePhotoLike}
            onAddComment={onAddComment ?? demo.addComment}
            onToggleCommentLike={onToggleCommentLike ?? demo.toggleCommentLike}
            onAddReply={onAddReply ?? demo.addReply}
            onToggleReplyLike={onToggleReplyLike ?? demo.toggleReplyLike}
            onOpenPlace={onOpenPlace ?? ((placeId) => router.push(`/places/${placeId}`))}
            onOpenProfile={onOpenProfile ?? ((userId) => router.push(`/profile/${userId}`))}
          />
        );
      })}
    </div>
  );
}
