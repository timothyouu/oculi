"use client";

import { Bookmark, Camera, Clock, MapPin, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { users } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import type { Photo, Place } from "../lib/types";
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
  const {
    comments,
    followedUserIds,
    likedPhotoIds,
    likedCommentIds,
    likedReplyIds,
    toggleFollowUser,
    togglePhotoLike,
    addComment,
    toggleCommentLike,
    addReply,
    toggleReplyLike
  } = useDemoState();
  const isSaved = savedPlaceIds.includes(place.id);
  const heroPhotos = photos.slice(0, 4);
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));
  const commentsByPhotoId = comments.reduce<Record<string, typeof comments>>((acc, comment) => {
    acc[comment.photoId] = [...(acc[comment.photoId] ?? []), comment];
    return acc;
  }, {});

  return (
    <article className="space-y-5">
      <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-1 bg-zinc-100 sm:grid-cols-[1.5fr_1fr]">
          <img
            src={heroPhotos[0]?.imageUrl || place.coverPhotoUrl}
            alt={`${place.name} hero photo`}
            className="aspect-[4/3] h-full w-full object-cover sm:aspect-[16/10]"
          />
          <div className="hidden grid-cols-2 gap-1 sm:grid">
            {(heroPhotos.length ? heroPhotos.slice(1, 4) : [place, place, place]).map((item, index) => (
              <img
                key={"id" in item ? item.id : index}
                src={"imageUrl" in item ? item.imageUrl : place.coverPhotoUrl}
                alt=""
                className={cx("h-full min-h-0 w-full object-cover", index === 2 && "col-span-2")}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-500">
                <MapPin className="size-4" aria-hidden="true" />
                {place.fuzzyLocationLabel}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">{place.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{place.description}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className={cx(
                  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                  isSaved ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
                )}
                onClick={() => onToggleSaved?.(place.id)}
              >
                <Bookmark className={cx("size-4", isSaved && "fill-current")} aria-hidden="true" />
                {isSaved ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white outline-none transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                onClick={() => onOpenUpload?.(place.id)}
              >
                <Camera className="size-4" aria-hidden="true" />
                Add photo
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Top-tier reason</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-950">
                <Sparkles className="size-4" aria-hidden="true" />
                {topReason || (place.timCurated ? "Tim-curated" : `${place.saveCount} saves`)}
              </p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Best times</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-950">
                <Clock className="size-4" aria-hidden="true" />
                {place.bestTimes.join(", ")}
              </p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Activity</p>
              <p className="mt-1 text-sm font-semibold text-zinc-950">
                {photos.length} photos · {place.saveCount} saves
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {place.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-label={`Photos from ${place.name}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-950">Recent photos here</h2>
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            onClick={() => onOpenUpload?.(place.id)}
          >
            Add yours
          </button>
        </div>
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
                comments={commentsByPhotoId[photo.id] ?? []}
                usersById={usersById}
                isSaved={isSaved}
                isFollowed={followedUserIds.includes(photographer.id)}
                isLiked={likedPhotoIds.includes(photo.id)}
                likedCommentIds={likedCommentIds}
                likedReplyIds={likedReplyIds}
                onToggleSaved={onToggleSaved}
                onToggleFollow={toggleFollowUser}
                onTogglePhotoLike={togglePhotoLike}
                onAddComment={addComment}
                onToggleCommentLike={toggleCommentLike}
                onAddReply={addReply}
                onToggleReplyLike={toggleReplyLike}
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
