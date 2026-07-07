"use client";

import { Bookmark, Heart, MapPin, MoreHorizontal, UserPlus } from "lucide-react";
import type { Comment, Photo, Place, User } from "../lib/types";
import { CommentThread } from "./comment-thread";

type PhotoCardProps = {
  photo: Photo;
  place: Place;
  photographer: User;
  comments?: Comment[];
  usersById?: Record<string, User | undefined>;
  isSaved?: boolean;
  isFollowed?: boolean;
  isLiked?: boolean;
  likedCommentIds?: string[];
  likedReplyIds?: string[];
  showComments?: boolean;
  onToggleSaved?: (placeId: string) => void;
  onToggleFollow?: (userId: string) => void;
  onTogglePhotoLike?: (photoId: string) => void;
  onAddComment?: (photoId: string, body: string) => void;
  onToggleCommentLike?: (commentId: string) => void;
  onAddReply?: (commentId: string, body: string) => void;
  onToggleReplyLike?: (replyId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  onOpenProfile?: (userId: string) => void;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PhotoCard({
  photo,
  place,
  photographer,
  comments = [],
  usersById = {},
  isSaved = false,
  isFollowed = false,
  isLiked = false,
  likedCommentIds = [],
  likedReplyIds = [],
  showComments = false,
  onToggleSaved,
  onToggleFollow,
  onTogglePhotoLike,
  onAddComment,
  onToggleCommentLike,
  onAddReply,
  onToggleReplyLike,
  onOpenPlace,
  onOpenProfile,
  className,
}: PhotoCardProps) {
  return (
    <article className={cx("overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm", className)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          onClick={() => onOpenProfile?.(photographer.id)}
          aria-label={`Open ${photographer.name}'s profile`}
        >
          <img src={photographer.avatarUrl} alt="" className="size-10 rounded-full bg-zinc-200 object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="block truncate text-left text-sm font-semibold text-zinc-950 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            onClick={() => onOpenProfile?.(photographer.id)}
          >
            {photographer.name}
          </button>
          <button
            type="button"
            className="flex max-w-full items-center gap-1 truncate text-left text-sm text-zinc-500 outline-none hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            onClick={() => onOpenPlace?.(place.id)}
          >
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {place.name} / {place.fuzzyLocationLabel}
            </span>
          </button>
        </div>
        {!isFollowed ? (
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 sm:inline-flex"
            onClick={() => onToggleFollow?.(photographer.id)}
          >
            <UserPlus className="size-3.5" aria-hidden="true" />
            Follow
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md p-2 text-zinc-500 outline-none transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          aria-label="More photo options"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        className="group block w-full bg-zinc-100 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-950"
        onClick={() => onOpenPlace?.(place.id)}
        aria-label={`Open ${place.name} detail`}
      >
        <img
          src={photo.imageUrl}
          alt={photo.caption || `Photo from ${place.name}`}
          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.01] sm:aspect-[5/4]"
        />
      </button>

      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                isLiked ? "bg-rose-50 text-rose-600" : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
              )}
              aria-label={isLiked ? "Unlike photo" : "Like photo"}
              onClick={() => onTogglePhotoLike?.(photo.id)}
            >
              <Heart className={cx("size-4", isLiked && "fill-current")} aria-hidden="true" />
              {photo.likeCount + (isLiked ? 1 : 0)}
            </button>
            {showComments ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-2 text-sm font-semibold text-zinc-700">
                {comments.length} notes
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={cx(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
              isSaved ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
            )}
            aria-label={isSaved ? `Remove ${place.name} from saved places` : `Save ${place.name}`}
            onClick={() => onToggleSaved?.(place.id)}
          >
            <Bookmark className={cx("size-4", isSaved && "fill-current")} aria-hidden="true" />
            {isSaved ? "Bookmarked" : "Bookmark"}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm leading-6 text-zinc-800">
            <span className="font-semibold text-zinc-950">{photographer.username}</span> {photo.caption}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {photo.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                #{tag}
              </span>
            ))}
          </div>
          <div className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            <p className="font-medium text-zinc-900">{photo.locationLabel || place.fuzzyLocationLabel}</p>
            {photo.metadataText || photo.shotAtTimeOfDay ? (
              <p className="mt-1">{[photo.shotAtTimeOfDay, photo.metadataText].filter(Boolean).join(" / ")}</p>
            ) : null}
          </div>
        </div>

        {showComments ? (
          <CommentThread
            photoId={photo.id}
            comments={comments}
            usersById={usersById}
            likedCommentIds={likedCommentIds}
            likedReplyIds={likedReplyIds}
            onAddComment={onAddComment}
            onToggleCommentLike={onToggleCommentLike}
            onAddReply={onAddReply}
            onToggleReplyLike={onToggleReplyLike}
            compact
          />
        ) : null}
      </div>
    </article>
  );
}
