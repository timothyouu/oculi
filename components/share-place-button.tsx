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
  align?: "left" | "right";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SharePlaceButton({
  place,
  className,
  triggerLabel,
  icon,
  align = "right",
}: SharePlaceButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
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
      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className={className}
        aria-label={triggerLabel ?? `Copy link to ${place.name}`}
        onClick={handleClick}
      >
        {status === "copied" ? <Check className="size-5" aria-hidden="true" /> : icon}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied"
          ? "Link copied to clipboard"
          : status === "failed"
            ? "Couldn't copy link"
            : ""}
      </span>
      {status !== "idle" ? (
        <span
          className={cx(
            "pointer-events-none absolute top-full z-20 mt-2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs text-white shadow-[0_8px_20px_rgba(29,29,27,0.24)]",
            align === "right" ? "right-0" : "left-0",
            status === "copied" ? "bg-[var(--moss)]" : "bg-[var(--ink)]",
          )}
        >
          {status === "copied" ? "Link copied" : "Couldn't copy link"}
        </span>
      ) : null}
    </span>
  );
}
