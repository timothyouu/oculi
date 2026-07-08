"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Heart,
  Info,
  MapPin,
  RotateCcw,
  X
} from "lucide-react";
import type { Photo, Place, User } from "../lib/types";
import { ResilientImage } from "./resilient-image";

const TUTORIAL_STORAGE_KEY = "oculi:has-seen-discover-tutorial";

type DiscoverDeckProps = {
  photos: Photo[];
  placesById: Record<string, Place | undefined>;
  usersById: Record<string, User | undefined>;
  savedPlaceIds: string[];
  followedUserIds: string[];
  viewedPhotoIds: string[];
  resumePlaceId?: string;
  resumeIndex?: number;
  canResume?: boolean;
  onViewPhoto?: (photo: Photo, activeIndex: number) => void;
  onToggleSaved: (placeId: string) => void;
  onOpenPlace: (placeId: string) => void;
  onOpenProfile: (userId: string) => void;
};

type DragState = {
  startX: number;
  currentX: number;
  dragging: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DiscoverDeck({
  photos,
  placesById,
  usersById,
  savedPlaceIds,
  followedUserIds,
  viewedPhotoIds,
  resumePlaceId,
  resumeIndex = 0,
  canResume = true,
  onViewPhoto,
  onToggleSaved,
  onOpenPlace,
  onOpenProfile,
}: DiscoverDeckProps) {
  const allCards = useMemo(
    () =>
      photos
        .map((photo) => {
          const place = placesById[photo.placeId];
          const photographer = usersById[photo.userId];
          return place && photographer ? { photo, place, photographer } : null;
        })
        .filter(Boolean) as Array<{ photo: Photo; place: Place; photographer: User }>,
    [photos, placesById, usersById],
  );
  const [queuePhotoIds, setQueuePhotoIds] = useState<string[] | null>(null);
  const cards = useMemo(() => {
    if (!queuePhotoIds) return [];
    const queueSet = new Set(queuePhotoIds);
    return allCards.filter((card) => queueSet.has(card.photo.id));
  }, [allCards, queuePhotoIds]);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, resumeIndex));
  const [drag, setDrag] = useState<DragState>({ startX: 0, currentX: 0, dragging: false });
  const [showTutorial, setShowTutorial] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) !== "true";
  });
  const appliedResumeRef = useRef(false);
  const lastRecordedViewRef = useRef("");

  const active = cards[activeIndex % Math.max(cards.length, 1)];
  const nextCards = cards.slice(activeIndex + 1, activeIndex + 3);
  const remainingCount = cards.length ? Math.max(cards.length - (activeIndex % cards.length) - 1, 0) : 0;
  const offset = drag.dragging ? drag.currentX - drag.startX : 0;
  const rotation = Math.max(-10, Math.min(10, offset / 28));
  const intent = offset > 48 ? "save" : offset < -48 ? "skip" : null;

  useEffect(() => {
    if (!canResume) return;

    const unseenPhotoIds = allCards
      .map((card) => card.photo.id)
      .filter((photoId) => !viewedPhotoIds.includes(photoId));

    setQueuePhotoIds((current) => {
      if (!current) return unseenPhotoIds;
      const nextPhotoIds = unseenPhotoIds.filter((photoId) => !current.includes(photoId));
      return nextPhotoIds.length ? [...current, ...nextPhotoIds] : current;
    });
  }, [allCards, canResume, viewedPhotoIds]);

  useEffect(() => {
    if (!canResume || !cards.length || appliedResumeRef.current) return;

    const resumePlaceIndex = resumePlaceId
      ? cards.findIndex((card) => card.place.id === resumePlaceId)
      : -1;
    const nextIndex =
      resumePlaceIndex >= 0 ? resumePlaceIndex : Math.min(Math.max(0, resumeIndex), cards.length - 1);

    setActiveIndex(nextIndex);
    appliedResumeRef.current = true;
  }, [canResume, cards, resumeIndex, resumePlaceId]);

  useEffect(() => {
    if (!active) return;

    const viewKey = `${active.place.id}:${activeIndex}`;
    if (lastRecordedViewRef.current === viewKey) return;

    lastRecordedViewRef.current = viewKey;
    onViewPhoto?.(active.photo, activeIndex);
  }, [active, activeIndex, onViewPhoto]);

  useEffect(() => {
    if (!cards.length || activeIndex < cards.length) return;
    setActiveIndex(activeIndex % cards.length);
  }, [activeIndex, cards.length]);

  const advance = () => {
    if (!cards.length) return;
    setActiveIndex((index) => (index + 1) % cards.length);
    setDrag({ startX: 0, currentX: 0, dragging: false });
  };

  const rewind = () => {
    if (!cards.length) return;
    setActiveIndex((index) => (index - 1 + cards.length) % cards.length);
    setDrag({ startX: 0, currentX: 0, dragging: false });
  };

  const saveAndAdvance = () => {
    if (!active) return;
    if (!savedPlaceIds.includes(active.place.id)) onToggleSaved(active.place.id);
    advance();
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    try {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    } catch {
      // The tutorial can still dismiss for this session if storage is unavailable.
    }
  };

  const handlePointerUp = () => {
    if (!active) return;
    if (offset > 110) {
      saveAndAdvance();
      return;
    }
    if (offset < -110) {
      advance();
      return;
    }
    setDrag({ startX: 0, currentX: 0, dragging: false });
  };

  if (!active) {
    return (
      <section className="rounded-md border border-dashed border-line bg-white p-8 text-center shadow-soft">
        <Compass className="mx-auto mb-3 size-9 text-moss" aria-hidden="true" />
        <h1 className="text-xl font-semibold tracking-tight text-ink">No photos to discover yet</h1>
        <p className="mt-2 text-sm text-ink/60">Upload the first post to start the Oculi deck.</p>
      </section>
    );
  }

  const isSaved = savedPlaceIds.includes(active.place.id);
  const isSuggested = !followedUserIds.includes(active.photographer.id);

  return (
    <section className="mx-auto w-full max-w-[980px]" aria-label="Swipe discovery">
      {showTutorial ? (
        <div className="mb-4 overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_16px_42px_rgba(39,34,27,0.08)]">
          <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--moss)]">Quick start</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--ink)]">Discover photo spots</h2>
              <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-3">
                <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white/62 px-3 py-2 sm:justify-start">
                  <Heart className="size-4 shrink-0 text-[var(--moss)]" aria-hidden="true" />
                  <span>Swipe right to save</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white/62 px-3 py-2 sm:justify-start">
                  <X className="size-4 shrink-0 text-[var(--ink)]" aria-hidden="true" />
                  <span>Swipe left to pass</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white/62 px-3 py-2 sm:justify-start">
                  <Info className="size-4 shrink-0 text-[var(--gold)]" aria-hidden="true" />
                  <span>Tap for details</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--moss)] px-5 text-base font-semibold text-white outline-none transition hover:bg-[var(--moss-dark)] sm:w-auto"
              onClick={dismissTutorial}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
      <div className="relative mx-auto max-w-[830px] pb-3">
        {nextCards.reverse().map((item, index) => (
          <div
            key={`${item.photo.id}-stack`}
            className={cx(
              "pointer-events-none absolute inset-y-7 overflow-hidden rounded-[26px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_24px_60px_rgba(39,34,27,0.09)]",
              index === 0 ? "-inset-x-5 scale-[0.98] opacity-35" : "-inset-x-3 scale-[0.99] opacity-55",
            )}
            aria-hidden="true"
          >
            <ResilientImage src={item.photo.imageUrl} alt="" draggable={false} className="h-full w-full object-cover" />
          </div>
        ))}

        <article
          className="relative z-10 select-none overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_28px_70px_rgba(39,34,27,0.14)] touch-none"
          style={{
            transform: `translateX(${offset}px) rotate(${rotation}deg)`,
            transition: drag.dragging ? "none" : "transform 180ms ease",
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrag({ startX: event.clientX, currentX: event.clientX, dragging: true });
          }}
          onPointerMove={(event) => {
            if (!drag.dragging) return;
            setDrag((current) => ({ ...current, currentX: event.clientX }));
          }}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag({ startX: 0, currentX: 0, dragging: false })}
          onDragStart={(event) => event.preventDefault()}
        >
          <div className="relative">
            <button
              type="button"
              className="group block w-full bg-zinc-100 text-left outline-none"
              onClick={() => onOpenPlace(active.place.id)}
              aria-label={`Open ${active.place.name}`}
            >
              <ResilientImage
                src={active.photo.imageUrl}
                alt={active.photo.caption || `${active.place.name} preview`}
                fallbackSrc={active.place.coverPhotoUrl}
                draggable={false}
                className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-[1.01] max-sm:aspect-[4/5]"
              />
            </button>

              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/24 bg-black/32 px-3 py-2 text-xs font-semibold text-white shadow-soft backdrop-blur sm:left-7 sm:top-7">
                {isSuggested ? "New post" : "Following"}
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/26 to-transparent px-5 pb-5 pt-28 text-white sm:px-7 sm:pb-7 sm:pt-36">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <button
                    type="button"
                    className="flex max-w-full items-center gap-2 rounded-full border border-white/28 bg-white/18 px-2.5 py-1.5 text-left text-xs text-white shadow-[0_10px_28px_rgba(0,0,0,0.24)] outline-none backdrop-blur-md transition hover:bg-white/24 focus-visible:ring-2 focus-visible:ring-white/80 sm:max-w-fit sm:px-3 sm:py-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenProfile(active.photographer.id);
                    }}
                  >
                    <ResilientImage
                      src={active.photographer.avatarUrl}
                      alt=""
                      className="size-6 rounded-full border border-white/60 object-cover shadow-sm"
                    />
                    <span className="truncate">
                      <span className="text-white/72">from</span>{" "}
                      <span className="font-semibold text-white">{active.photographer.name}</span>{" "}
                      <span className="text-white/78">{active.photographer.username}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex max-w-full items-center gap-1.5 rounded-full border border-white/24 bg-black/22 px-3 py-2 text-left text-xs text-white outline-none backdrop-blur-md transition hover:bg-black/32 focus-visible:ring-2 focus-visible:ring-white/80"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenPlace(active.place.id);
                    }}
                  >
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{active.place.name}</span>
                  </button>
                </div>
                <div className="mx-auto mt-3 flex w-fit gap-2 sm:mt-5">
                  {[0, 1, 2, 3].map((dot) => (
                    <span key={dot} className={cx("size-2 rounded-full", dot === 0 ? "bg-white" : "bg-white/45")} />
                  ))}
                </div>
              </div>

              {intent ? (
                <div
                  className={cx(
                    "pointer-events-none absolute top-10 rounded-md border-2 px-4 py-2 text-lg font-black uppercase tracking-[0.2em]",
                    intent === "save"
                      ? "right-8 rotate-6 border-amber-300 bg-amber-300/12 text-amber-200"
                      : "left-8 -rotate-6 border-white/70 bg-white/10 text-white",
                  )}
                >
                  {intent === "save" ? "Save" : "Pass"}
                </div>
              ) : null}
            </div>

        </article>
      </div>

      <div className="relative z-20 mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-full bg-[rgba(248,245,239,0.72)] px-4 py-2 backdrop-blur-sm sm:mt-10 sm:py-3">
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-[0_12px_28px_rgba(39,34,27,0.08)] outline-none transition hover:bg-white"
            onClick={rewind}
            aria-label="Go back one card"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-[0_12px_28px_rgba(39,34,27,0.08)] outline-none transition hover:bg-white sm:size-16"
            onClick={advance}
            aria-label={`Pass on ${active.place.name}`}
          >
            <X className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cx(
              "flex size-14 items-center justify-center rounded-full shadow-[0_14px_34px_rgba(39,34,27,0.16)] outline-none transition sm:size-20",
              isSaved ? "bg-[var(--gold)] text-white" : "bg-[var(--moss)] text-white hover:bg-[var(--moss-dark)]",
            )}
            onClick={saveAndAdvance}
            aria-label={`Save ${active.place.name} and show next`}
          >
            <Heart className={cx("size-6 sm:size-8", isSaved && "fill-current")} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--gold)] shadow-[0_12px_28px_rgba(39,34,27,0.08)] outline-none transition hover:bg-white sm:size-16"
            onClick={() => onOpenPlace(active.place.id)}
            aria-label={`View details for ${active.place.name}`}
          >
            <Info className="size-6" aria-hidden="true" />
          </button>
      </div>
      <p className="mx-auto mt-2 max-w-md text-center text-base text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">{remainingCount}</span> photos left in your queue
      </p>
    </section>
  );
}
