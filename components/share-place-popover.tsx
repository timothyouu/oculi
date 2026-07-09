"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Link as LinkIcon, Mail, MessageCircle, Twitter } from "lucide-react";
import {
  buildPlaceSharePayload,
  buildPlaceShareTargets,
  buildPlaceShareUrl,
} from "@/lib/share-place";
import type { Place } from "@/lib/types";

type SharePlacePopoverProps = {
  place: Place;
  className?: string;
  triggerLabel?: string;
  icon: ReactNode;
  align?: "left" | "right";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const targetIcons: Record<string, ReactNode> = {
  x: <Twitter className="size-4" aria-hidden="true" />,
  whatsapp: <MessageCircle className="size-4" aria-hidden="true" />,
  email: <Mail className="size-4" aria-hidden="true" />,
};

export function SharePlacePopover({
  place,
  className,
  triggerLabel,
  icon,
  align = "right",
}: SharePlacePopoverProps) {
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstRowRef = useRef<HTMLButtonElement>(null);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    firstRowRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current) return;
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closePopover() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev;
      if (!next) {
        // Closing via the trigger itself; reset transient copy state.
        setCopyStatus("idle");
        setManualUrl(null);
      }
      return next;
    });
  }

  async function handleCopyLink() {
    if (typeof window === "undefined") return;
    const url = buildPlaceShareUrl(place, window.location.origin);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      setManualUrl(null);
      setCopyStatus("copied");
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = setTimeout(() => {
        setCopyStatus("idle");
      }, 1800);
    } catch {
      setCopyStatus("manual");
      setManualUrl(url);
    }
  }

  async function handleNativeShare() {
    if (typeof window === "undefined") return;
    const payload = buildPlaceSharePayload(place, window.location.origin);

    try {
      await navigator.share(payload);
      closePopover();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const targets =
    typeof window !== "undefined"
      ? buildPlaceShareTargets(buildPlaceSharePayload(place, window.location.origin))
      : [];

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-label={triggerLabel ?? `Share ${place.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
      >
        {icon}
      </button>

      {open ? (
        <div
          role="menu"
          className={cx(
            "absolute top-full z-20 mt-2 w-56 space-y-1 rounded-lg border border-[var(--line)] bg-white p-1.5 shadow-[0_12px_28px_rgba(29,29,27,0.18)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <button
            ref={firstRowRef}
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--chip)]"
            onClick={handleCopyLink}
          >
            {copyStatus === "copied" ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <LinkIcon className="size-4" aria-hidden="true" />
            )}
            {copyStatus === "copied" ? "Copied ✓" : "Copy link"}
          </button>

          {copyStatus === "manual" && manualUrl ? (
            <p className="px-3 pb-1 text-xs text-[var(--muted)]">
              Copy failed. Select the link:{" "}
              <span className="select-all break-all text-[var(--ink)]">{manualUrl}</span>
            </p>
          ) : null}

          {canNativeShare ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--chip)]"
              onClick={handleNativeShare}
            >
              Share…
            </button>
          ) : null}

          {targets.map((target) => (
            <a
              key={target.id}
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--chip)]"
              onClick={closePopover}
            >
              {targetIcons[target.id]}
              {target.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
