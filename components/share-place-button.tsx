"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { buildPlaceShareUrl } from "@/lib/share-place";
import type { Place } from "@/lib/types";

type SharePlaceButtonProps = {
  place: Place;
  className?: string;
  triggerLabel?: string;
  icon: ReactNode;
  onStatusChange?: (message: string | null) => void;
};

export function SharePlaceButton({
  place,
  className,
  triggerLabel,
  icon,
  onStatusChange,
}: SharePlaceButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  async function handleClick() {
    if (typeof window === "undefined") return;
    const url = buildPlaceShareUrl(place, window.location.origin);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onStatusChange?.("Link copied to clipboard");
    } catch {
      setCopied(false);
      onStatusChange?.("Couldn't copy link");
    }

    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      onStatusChange?.(null);
    }, 1800);
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={triggerLabel ?? `Copy link to ${place.name}`}
      onClick={handleClick}
    >
      {copied ? <Check className="size-5" aria-hidden="true" /> : icon}
    </button>
  );
}
