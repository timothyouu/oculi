"use client";

import { Heart, MapPin } from "lucide-react";
import type { Photo, Place, User } from "../lib/types";
import { ResilientImage } from "./resilient-image";

type PhotoCardProps = {
  photo: Photo;
  place: Place;
  photographer: User;
  isFollowed?: boolean;
  isCurrentUser?: boolean;
  isLiked?: boolean;
  onToggleFollow?: (userId: string) => void;
  onTogglePhotoLike?: (photoId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  onOpenProfile?: (userId: string) => void;
  className?: string;
  priority?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PhotoCard({
  photo,
  place,
  photographer,
  isFollowed = false,
  isCurrentUser = false,
  isLiked = false,
  onToggleFollow,
  onTogglePhotoLike,
  onOpenPlace,
  onOpenProfile,
  className,
  priority = false,
}: PhotoCardProps) {
  return (
    <article className={cx("overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_18px_48px_rgba(39,34,27,0.08)]", className)}>
      <div className="group relative bg-zinc-100">
        <button
          type="button"
          className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-950"
          onClick={() => onOpenPlace?.(place.id)}
          aria-label={`Open ${place.name} detail`}
        >
          <ResilientImage
            src={photo.imageUrl}
            alt={photo.caption || `Photo from ${place.name}`}
            fallbackSrc={place.coverPhotoUrl}
            priority={priority}
            className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-[1.01]"
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent px-4 pb-4 pt-20">
          <div className="pointer-events-auto flex flex-wrap items-end justify-between gap-2">
            <button
              type="button"
              className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/28 bg-white/18 px-2.5 py-1.5 text-left text-xs text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] outline-none backdrop-blur-md transition hover:bg-white/24 focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={() => onOpenProfile?.(photographer.id)}
            >
              <ResilientImage
                src={photographer.avatarUrl}
                alt=""
                className="size-6 rounded-full border border-white/70 object-cover"
              />
              <span className="truncate">
                <span className="text-white/72">by</span>{" "}
                <span className="font-semibold">{photographer.name}</span>{" "}
                <span className="text-white/78">{photographer.username}</span>
              </span>
            </button>

            <button
              type="button"
              className="flex max-w-full items-center gap-1.5 rounded-full border border-white/24 bg-black/24 px-3 py-1.5 text-left text-xs text-white outline-none backdrop-blur-md transition hover:bg-black/34 focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={() => onOpenPlace?.(place.id)}
            >
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{place.name}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
              isLiked ? "bg-rose-50 text-rose-600" : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
            )}
            aria-label={isLiked ? "Unlike photo" : "Like photo"}
            onClick={() => onTogglePhotoLike?.(photo.id)}
          >
            <Heart className={cx("size-4", isLiked && "fill-current")} aria-hidden="true" />
            {photo.likeCount + (isLiked ? 1 : 0)}
          </button>
      </div>
    </article>
  );
}
