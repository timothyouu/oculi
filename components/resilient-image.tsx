"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Image, { type ImageProps } from "next/image";
import { attributionForPhoto, attributionLabel, isOptimizerAllowedSrc } from "@/lib/image-attribution";
import type { PhotoAttribution } from "@/lib/types";

const FALLBACK_IMAGE_URL = "/generated/golden-gate-overlook.png";

/** Don't render the credit chip on thumbnails narrower than this -- it would cover most of the image. */
const MIN_ATTRIBUTION_WIDTH_PX = 120;

type ResilientImageProps = Omit<ImageProps, "src" | "alt" | "fill" | "width" | "height" | "onError" | "onLoad"> & {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  /** Explicit photo attribution; falls back to URL-derived attribution (e.g. Wikimedia). */
  attribution?: PhotoAttribution | null;
  /** Suppress the attribution credit overlay even when one would be derivable. */
  hideAttribution?: boolean;
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
};

function resolveImageSrc(src: string | undefined, fallbackSrc: string) {
  if (typeof src === "string" && src.includes("source.unsplash.com")) return fallbackSrc;
  return src || fallbackSrc;
}

function extractObjectFitClass(className: string | undefined): string {
  const match = className?.match(/object-(cover|contain|fill|none|scale-down)/);
  return match ? match[0] : "object-cover";
}

/**
 * Wraps next/image with the same "never show a broken image" fallback
 * behavior the old raw <img>-based ResilientImage had, plus an automatic
 * Wikimedia attribution credit derived purely from `src` (see
 * lib/image-attribution.ts) -- callers don't need to pass anything for
 * Wikimedia-hosted seed photos to get their required credit, which also
 * covers photo surfaces (photo-card.tsx, discover-deck.tsx,
 * selected-place-card.tsx's post view) without editing those files. The
 * chip is size-gated: thumbnails narrower than ~120px render no credit.
 *
 * Renders `fill` inside a positioned wrapper that inherits the caller's
 * sizing classes (aspect-*, size-*, w-*, h-*, etc.), so every existing
 * call site's CSS-based box sizing keeps working unchanged.
 *
 * Defaults: `loading="eager"` matches the old raw <img> semantics (the
 * discover deck's top card is the "/" LCP and must not turn lazy), and
 * `unoptimized` is derived per-src so arbitrary user-supplied URLs
 * (pasted avatar URLs, blob:/data: previews) never hit next/image's
 * "hostname not configured" failure -- both are overridable via props.
 */
export function ResilientImage({
  src,
  fallbackSrc = FALLBACK_IMAGE_URL,
  alt = "",
  className,
  attribution,
  hideAttribution = false,
  onError,
  onLoad,
  sizes = "100vw",
  loading = "eager",
  unoptimized,
  ...props
}: ResilientImageProps) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const [currentSrc, setCurrentSrc] = useState(() => resolveImageSrc(src, fallbackSrc));
  const [broken, setBroken] = useState(false);
  const [wideEnoughForCredit, setWideEnoughForCredit] = useState(false);

  useEffect(() => {
    setCurrentSrc(resolveImageSrc(src, fallbackSrc));
    setBroken(false);
  }, [fallbackSrc, src]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      setWideEnoughForCredit(wrapper.offsetWidth >= MIN_ATTRIBUTION_WIDTH_PX);
    });
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  const resolvedSrc = broken ? fallbackSrc : currentSrc || fallbackSrc;
  const objectFitClass = extractObjectFitClass(className);
  const credit =
    hideAttribution || !wideEnoughForCredit ? null : attributionForPhoto(resolvedSrc, attribution);

  return (
    <span ref={wrapperRef} className={`relative block overflow-hidden ${className ?? ""}`}>
      <Image
        {...props}
        src={resolvedSrc}
        alt={alt}
        fill
        sizes={sizes}
        loading={loading}
        unoptimized={unoptimized ?? !isOptimizerAllowedSrc(resolvedSrc)}
        className={objectFitClass}
        onError={(event) => {
          onError?.(event);
          if (resolvedSrc !== fallbackSrc) setBroken(true);
        }}
        onLoad={(event) => {
          onLoad?.(event);
          if (event.currentTarget.naturalWidth === 0 && resolvedSrc !== fallbackSrc) {
            setBroken(true);
          }
        }}
      />
      {credit ? (
        <span className="pointer-events-none absolute bottom-1 right-1 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[10px] leading-none text-white/90">
          {credit.sourceUrl ? (
            <a
              href={credit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="pointer-events-auto underline-offset-2 hover:underline"
            >
              {attributionLabel(credit)}
            </a>
          ) : (
            attributionLabel(credit)
          )}
        </span>
      ) : null}
    </span>
  );
}
