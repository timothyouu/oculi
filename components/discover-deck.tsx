"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  Camera,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  RotateCcw,
  Sparkles,
  X
} from "lucide-react";
import type { Photo, Place, User } from "../lib/types";

type DiscoverDeckProps = {
  photos: Photo[];
  placesById: Record<string, Place | undefined>;
  usersById: Record<string, User | undefined>;
  savedPlaceIds: string[];
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
  onToggleSaved,
  onOpenPlace,
  onOpenProfile,
}: DiscoverDeckProps) {
  const cards = useMemo(
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [drag, setDrag] = useState<DragState>({ startX: 0, currentX: 0, dragging: false });

  const active = cards[activeIndex % Math.max(cards.length, 1)];
  const nextCards = cards.slice(activeIndex + 1, activeIndex + 3);
  const offset = drag.dragging ? drag.currentX - drag.startX : 0;
  const rotation = Math.max(-10, Math.min(10, offset / 28));
  const intent = offset > 48 ? "save" : offset < -48 ? "skip" : null;

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
        <h1 className="text-xl font-semibold tracking-tight text-ink">No places to discover yet</h1>
        <p className="mt-2 text-sm text-ink/60">Upload the first spot to start the Oculi deck.</p>
      </section>
    );
  }

  const isSaved = savedPlaceIds.includes(active.place.id);

  return (
    <section className="mx-auto w-full max-w-4xl" aria-label="Swipe discovery">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-moss">
            <Sparkles className="size-4" aria-hidden="true" />
            Discover
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Swipe through places worth shooting.</h1>
        </div>
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink/65 shadow-soft">
          <span className="font-semibold text-ink">{activeIndex + 1}</span> / {cards.length} in San Francisco
        </div>
      </div>

      <div className="relative mx-auto min-h-[620px] max-w-2xl sm:min-h-[700px]">
        {nextCards.reverse().map((item, index) => (
          <div
            key={`${item.photo.id}-stack`}
            className={cx(
              "absolute inset-x-4 top-7 overflow-hidden rounded-md border border-line bg-white shadow-soft",
              index === 0 ? "translate-y-6 scale-[0.94] opacity-45" : "translate-y-3 scale-[0.97] opacity-70",
            )}
            aria-hidden="true"
          >
            <img src={item.photo.imageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
          </div>
        ))}

        <article
          className="absolute inset-x-0 top-0 overflow-hidden rounded-md border border-line bg-white shadow-soft touch-none"
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
        >
          <div className="relative">
            <button
              type="button"
              className="group block w-full bg-zinc-100 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              onClick={() => onOpenPlace(active.place.id)}
              aria-label={`Open ${active.place.name}`}
            >
              <img
                src={active.photo.imageUrl}
                alt={active.photo.caption || `${active.place.name} preview`}
                className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.01]"
              />
            </button>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/68 to-transparent px-5 pb-5 pt-28 text-white">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {active.photo.shotAtTimeOfDay || active.place.bestTimes[0] || "Anytime"}
                  </span>
                  {active.place.timCurated ? (
                    <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-ink">Tim-curated</span>
                  ) : null}
                </div>
                <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">{active.place.name}</h2>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/78">
                  <MapPin className="size-4 shrink-0" aria-hidden="true" />
                  {active.place.fuzzyLocationLabel}
                </p>
              </div>

              <button
                type="button"
                className={cx(
                  "absolute right-0 top-5 flex min-h-16 w-14 translate-x-1 items-center justify-center rounded-l-md border-y border-l border-white/40 shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-white",
                  isSaved ? "bg-amber-300 text-ink" : "bg-white/92 text-ink hover:bg-white",
                )}
                aria-label={isSaved ? `Remove ${active.place.name} from bookmarks` : `Bookmark ${active.place.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSaved(active.place.id);
                }}
              >
                <Bookmark className={cx("size-6", isSaved && "fill-current")} aria-hidden="true" />
              </button>

              {intent ? (
                <div
                  className={cx(
                    "pointer-events-none absolute top-10 rounded-md border-2 px-4 py-2 text-lg font-black uppercase tracking-[0.2em]",
                    intent === "save"
                      ? "right-8 rotate-6 border-amber-300 bg-amber-300/12 text-amber-200"
                      : "left-8 -rotate-6 border-white/70 bg-white/10 text-white",
                  )}
                >
                  {intent === "save" ? "Bookmark" : "Pass"}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="min-w-0">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                  onClick={() => onOpenProfile(active.photographer.id)}
                >
                  <img src={active.photographer.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{active.photographer.name}</span>
                    <span className="block text-xs text-ink/55">{active.photographer.username}</span>
                  </span>
                </button>
                <p className="mt-4 text-sm leading-6 text-ink/72">{active.photo.caption}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {active.photo.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink/64">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-ink/62 sm:grid-cols-1">
                <div className="rounded-md bg-paper p-3">
                  <span className="flex items-center gap-1.5 font-semibold text-ink">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {active.place.bestTimes[0] || "Anytime"}
                  </span>
                  best light
                </div>
                <div className="rounded-md bg-paper p-3">
                  <span className="flex items-center gap-1.5 font-semibold text-ink">
                    <Camera className="size-3.5" aria-hidden="true" />
                    {active.photo.metadataText || "Photo notes"}
                  </span>
                  field note
                </div>
              </div>
            </div>
        </article>
      </div>

      <div className="relative z-20 mx-auto mt-4 flex max-w-md items-center justify-center gap-3">
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            onClick={rewind}
            aria-label="Go back one card"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            onClick={advance}
            aria-label={`Pass on ${active.place.name}`}
          >
            <X className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cx(
              "flex size-16 items-center justify-center rounded-full text-ink shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
              isSaved ? "bg-amber-300" : "bg-moss text-white hover:bg-moss/90",
            )}
            onClick={saveAndAdvance}
            aria-label={`Bookmark ${active.place.name} and show next`}
          >
            <Bookmark className={cx("size-7", isSaved && "fill-current")} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            onClick={() => onOpenPlace(active.place.id)}
            aria-label={`View details for ${active.place.name}`}
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
      </div>
      <p className="mx-auto mt-3 max-w-md text-center text-xs font-medium text-ink/48">
        Drag left to pass, right to bookmark, or search above when you know what you want.
      </p>
    </section>
  );
}
