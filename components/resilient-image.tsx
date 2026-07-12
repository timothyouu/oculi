"use client";

import Image from "next/image";
import { useState } from "react";
import { shouldBypassImageOptimizer } from "@/lib/image-attribution";

const FALLBACK_IMAGE_URL = "/generated/golden-gate-overlook.png";

// Hosts allowed through next/image's server-side optimizer. Must mirror the hostnames configured
// in next.config.mjs `images.remotePatterns` MINUS the hosts `shouldBypassImageOptimizer` routes
// around (Wikimedia rate-limits the optimizer's single server IP with 429s -- see
// lib/image-attribution.ts). next/image throws synchronously at render time (not a catchable
// onError) for a remote src whose host isn't allow-listed in remotePatterns -- a real risk here
// because `avatarUrl` is one of the few fields a visitor can free-type into
// (components/profile-summary.tsx's "Avatar URL" edit field), so an arbitrary pasted host must
// not crash the page. Anything not optimizer-eligible renders `unoptimized` (still displayed,
// no crash, browser fetches it directly) instead.
const OPTIMIZED_REMOTE_HOSTS = new Set([
  "images.unsplash.com",
  "xlzknvhiuhtcqmqrypqh.supabase.co",
]);

function shouldRenderUnoptimized(src: string): boolean {
  if (shouldBypassImageOptimizer(src)) return true;
  try {
    const parsed = new URL(src);
    return !OPTIMIZED_REMOTE_HOSTS.has(parsed.hostname);
  } catch {
    // Relative/local path (e.g. "/generated/..."), not a remote URL -- always optimizer-safe.
    return false;
  }
}

type ResilientImageProps = {
  src: string | undefined;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  draggable?: boolean;
  sizes?: string;
  priority?: boolean;
};

function resolveImageSrc(src: string | undefined, fallbackSrc: string) {
  if (typeof src === "string" && src.includes("source.unsplash.com")) return fallbackSrc;
  return src || fallbackSrc;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function hasOutOfFlowPosition(className: string | undefined): boolean {
  return className?.split(/\s+/).some((classToken) => classToken === "absolute" || classToken === "fixed") ?? false;
}

// Wraps next/image in `fill` mode so every existing call site can keep sizing itself purely via
// className (aspect ratios, size-N, absolute inset-0, etc.) on the wrapper, same as the raw <img>
// it replaces -- see the Task 9 (image pipeline) note in CLAUDE.md. Every current call site's
// className already ends in "object-cover", so the inner Image always uses that; the wrapper
// needs `relative overflow-hidden` so `fill` has a positioned box to fill and rounded corners
// still clip the image. Preserves the original fallback semantics: dead `source.unsplash.com`
// URLs are rewritten up front, and a real load failure (onError) or a zero-dimension "success"
// (onLoad with naturalWidth 0, matching the pre-migration <img> behavior) falls back to
// `fallbackSrc` (defaulting to a local demo asset, so it's always a same-origin, non-remote URL
// and safe to render unoptimized without a remotePatterns entry).
export function ResilientImage({
  src,
  fallbackSrc = FALLBACK_IMAGE_URL,
  alt = "",
  className,
  draggable,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
}: ResilientImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const requestedSrc = resolveImageSrc(src, fallbackSrc);
  const resolvedSrc = requestedSrc === failedSrc ? fallbackSrc : requestedSrc;

  return (
    <span className={cx("block overflow-hidden", !hasOutOfFlowPosition(className) && "relative", className)}>
      <Image
        key={resolvedSrc}
        src={resolvedSrc}
        alt={alt}
        fill
        draggable={draggable}
        sizes={sizes}
        // Next 16's LCP detector requires an explicit eager load for
        // above-the-fold unoptimized images; the legacy `priority` flag no
        // longer suppresses that warning on direct Wikimedia requests.
        loading={priority ? "eager" : undefined}
        unoptimized={shouldRenderUnoptimized(resolvedSrc)}
        className="object-cover"
        onError={() => {
          if (resolvedSrc !== fallbackSrc) setFailedSrc(resolvedSrc);
        }}
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth === 0 && resolvedSrc !== fallbackSrc) {
            setFailedSrc(resolvedSrc);
          }
        }}
      />
    </span>
  );
}
