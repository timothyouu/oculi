"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Heart, Images, Send, X } from "lucide-react";
import type { Photo, Place, User } from "@/lib/types";
import { accessibilityForPlace } from "@/lib/place-accessibility";
import { attributionForImageUrl } from "@/lib/image-attribution";
import { sceneLabelsFor } from "@/lib/place-taxonomy";
import { ResilientImage } from "./resilient-image";
import { SharePlaceButton } from "./share-place-button";

type SelectedPlaceCardProps = {
  place: Place;
  photos?: Photo[];
  users?: User[];
  isSaved?: boolean;
  likedPhotoIds?: string[];
  onToggleSaved?: (placeId: string) => void;
  onTogglePhotoLike?: (photoId: string) => void;
  onOpenPlace?: (placeId: string) => void;
  onClose?: () => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatPhotoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function SelectedPlaceCard({
  place,
  photos = [],
  users = [],
  isSaved = false,
  likedPhotoIds = [],
  onToggleSaved,
  onTogglePhotoLike,
  onOpenPlace,
  onClose,
}: SelectedPlaceCardProps) {
  const [view, setView] = useState<"overview" | "gallery" | "post">("overview");
  const [cardNotice, setCardNotice] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const placePhotos = useMemo(
    () => photos.filter((photo) => photo.placeId === place.id),
    [photos, place.id],
  );
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const photoCount = placePhotos.length;
  const visiblePhotos = placePhotos.slice(0, 6);
  const activePhoto = visiblePhotos[selectedPhotoIndex];
  const activePhotographer = activePhoto ? usersById.get(activePhoto.userId) : undefined;
  const isActivePhotoLiked = activePhoto ? likedPhotoIds.includes(activePhoto.id) : false;

  useEffect(() => {
    setView("overview");
    setCardNotice(null);
    setSelectedPhotoIndex(0);
  }, [place.id]);

  useEffect(() => {
    if (!cardNotice) return;
    const timeout = setTimeout(() => setCardNotice(null), 2000);
    return () => clearTimeout(timeout);
  }, [cardNotice]);

  function handleToggleSaved() {
    onToggleSaved?.(place.id);
    setCardNotice(isSaved ? "Removed from saved" : "Saved to your places");
  }

  if (view === "gallery") {
    return (
      <div className="flex max-h-[min(620px,calc(100vh-4rem))] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]"
            aria-label={`Back to ${place.name}`}
            onClick={() => setView("overview")}
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-2xl font-semibold text-[var(--ink)]">Photos</h3>
            <p className="truncate text-sm text-[var(--muted)]">
              {photoCount} photo{photoCount === 1 ? "" : "s"} in {place.name}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]"
              aria-label={`Close ${place.name} card`}
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 space-y-2 overflow-y-auto p-3">
          {visiblePhotos.length ? (
            visiblePhotos.map((photo, index) => {
              const photographer = usersById.get(photo.userId);
              const isLiked = likedPhotoIds.includes(photo.id);
              return (
                <div
                  key={photo.id}
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-[var(--line)] hover:bg-white"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={`View post: ${photo.caption || `Photo ${index + 1}`}`}
                    onClick={() => {
                      setSelectedPhotoIndex(index);
                      setView("post");
                    }}
                  >
                    <ResilientImage
                      src={photo.imageUrl}
                      alt={photo.caption}
                      fallbackSrc={place.coverPhotoUrl}
                      className="size-16 shrink-0 rounded-lg bg-[var(--chip)] object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-[var(--ink)]">
                        {photo.caption || `Photo ${index + 1}`}
                      </span>
                      <span className="mt-1 block truncate text-sm text-[var(--muted)]">
                        {photographer ? `${photographer.name} · ` : ""}
                        {formatPhotoDate(photo.createdAt)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={cx(
                      "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition",
                      isLiked
                        ? "border-transparent bg-rose-50 text-rose-600"
                        : "border-[var(--line)] bg-white text-[var(--muted)] hover:bg-zinc-50",
                    )}
                    aria-label={isLiked ? "Unlike photo" : "Like photo"}
                    aria-pressed={isLiked}
                    onClick={() => onTogglePhotoLike?.(photo.id)}
                  >
                    <Heart className={cx("size-3", isLiked && "fill-current")} aria-hidden="true" />
                    {photo.likeCount + (isLiked ? 1 : 0)}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm text-[var(--muted)]">
              No photos match the current filters for this area.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "post" && activePhoto) {
    const hasMultiple = visiblePhotos.length > 1;
    const activeAttribution = attributionForImageUrl(activePhoto.imageUrl);
    const goToPhoto = (index: number) => {
      setSelectedPhotoIndex((index + visiblePhotos.length) % visiblePhotos.length);
    };

    return (
      <div className="flex max-h-[min(620px,calc(100vh-4rem))] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]"
            aria-label="Back to photos"
            onClick={() => setView("gallery")}
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-2xl font-semibold text-[var(--ink)]">Post</h3>
            <p className="truncate text-sm text-[var(--muted)]">
              {selectedPhotoIndex + 1} of {visiblePhotos.length} · {place.name}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]"
              aria-label={`Close ${place.name} card and return to map`}
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 overflow-y-auto">
          <div className="relative">
            <ResilientImage
              src={activePhoto.imageUrl}
              alt={activePhoto.caption || `Photo from ${place.name}`}
              fallbackSrc={place.coverPhotoUrl}
              className="aspect-[4/3] w-full object-cover"
            />
            {hasMultiple ? (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/55 bg-[rgba(29,29,27,0.62)] text-white shadow-[0_8px_20px_rgba(29,29,27,0.24)] backdrop-blur"
                  aria-label="Previous photo"
                  onClick={() => goToPhoto(selectedPhotoIndex - 1)}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/55 bg-[rgba(29,29,27,0.62)] text-white shadow-[0_8px_20px_rgba(29,29,27,0.24)] backdrop-blur"
                  aria-label="Next photo"
                  onClick={() => goToPhoto(selectedPhotoIndex + 1)}
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          <div className="space-y-3 p-4">
            {activePhotographer ? (
              <div className="flex items-center gap-2.5">
                <ResilientImage
                  src={activePhotographer.avatarUrl}
                  alt=""
                  className="size-9 shrink-0 rounded-full border border-[var(--line)] object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                    {activePhotographer.name}
                  </span>
                  <span className="block truncate text-xs text-[var(--muted)]">
                    {activePhotographer.username}
                  </span>
                </span>
              </div>
            ) : null}

            {activePhoto.caption ? (
              <p className="text-base leading-relaxed text-[var(--ink)]">{activePhoto.caption}</p>
            ) : null}

            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
              <button
                type="button"
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-2 py-1 transition",
                  isActivePhotoLiked ? "text-rose-600" : "hover:text-[var(--ink)]",
                )}
                aria-label={isActivePhotoLiked ? "Unlike photo" : "Like photo"}
                aria-pressed={isActivePhotoLiked}
                onClick={() => onTogglePhotoLike?.(activePhoto.id)}
              >
                <Heart className={cx("size-4", isActivePhotoLiked && "fill-current")} aria-hidden="true" />
                {activePhoto.likeCount + (isActivePhotoLiked ? 1 : 0)}
              </button>
              <span>{formatPhotoDate(activePhoto.createdAt)}</span>
            </div>

            {activePhoto.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {activePhoto.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--ink)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {activeAttribution ? (
              <p className="text-xs text-[var(--ink)]/50">
                <a
                  href={activeAttribution.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2 hover:text-[var(--ink)]/80"
                >
                  {activeAttribution.label}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <ResilientImage src={place.coverPhotoUrl} alt="" priority className="aspect-[16/9] w-full object-cover" />
        <button
          type="button"
          className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/55 bg-[rgba(29,29,27,0.72)] px-3 py-2 text-sm text-white shadow-[0_8px_20px_rgba(29,29,27,0.24)] backdrop-blur"
          aria-label={`Show ${photoCount} photo${photoCount === 1 ? "" : "s"} from ${place.name}`}
          onClick={() => setView("gallery")}
        >
          <Images className="size-4" aria-hidden="true" />
          {photoCount} photo{photoCount === 1 ? "" : "s"}
        </button>
        {onClose ? (
          <button
            type="button"
            className="absolute left-3 top-3 grid size-9 place-items-center rounded-full border border-white/55 bg-[rgba(29,29,27,0.72)] text-white shadow-[0_8px_20px_rgba(29,29,27,0.24)] backdrop-blur"
            aria-label={`Close ${place.name} card`}
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-semibold text-[var(--ink)]">{place.name}</h3>
          <p className="truncate text-base text-[var(--muted)]">{place.fuzzyLocationLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {place.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--ink)]">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm text-[var(--muted)]">
          {[sceneLabelsFor(place).join(" · "), `${accessibilityForPlace(place)} to reach`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
          <Bookmark className="size-4" aria-hidden="true" />
          {place.saveCount} saves
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_56px] gap-3">
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--moss)] text-base text-white"
            onClick={() => onOpenPlace?.(place.id)}
          >
            Open place
          </button>
          <button
            type="button"
            className={cx(
              "inline-flex h-12 items-center justify-center gap-2 rounded-lg text-base",
              isSaved
                ? "bg-[var(--gold)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink)]",
            )}
            aria-pressed={isSaved}
            onClick={handleToggleSaved}
          >
            <Bookmark className={cx("size-4", isSaved && "fill-current")} aria-hidden="true" />
            {isSaved ? "Saved" : "Save"}
          </button>
          <SharePlaceButton
            place={place}
            icon={<Send className="size-5" />}
            onStatusChange={setCardNotice}
            className="grid size-12 place-items-center rounded-lg border border-[var(--line)] bg-white text-[var(--ink)]"
          />
        </div>
        {cardNotice ? (
          <p className="text-sm text-[var(--moss)]" aria-live="polite">
            {cardNotice}
          </p>
        ) : null}
      </div>
    </>
  );
}
