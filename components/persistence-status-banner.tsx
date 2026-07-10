"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useDemoState } from "@/lib/demo-state";
import type { PersistenceStatus } from "@/lib/persistence-status";

// Global, single-instance banner reflecting the latest Supabase write status
// (docs/demo-to-product-audit.md item 5 - failed saves used to be a silent
// console.warn). Hidden while "saving"/"saved"/idle; shows a retrying notice,
// then a terminal failure notice with a manual Retry button.
export function PersistenceStatusBanner() {
  const { persistenceStatus, retryPersistence } = useDemoState();
  const [dismissed, setDismissed] = useState(false);
  const prevStatusRef = useRef<PersistenceStatus | null>(null);

  useEffect(() => {
    const previous = prevStatusRef.current;
    const enteringTrouble =
      (persistenceStatus === "retrying" || persistenceStatus === "failed") &&
      previous !== "retrying" &&
      previous !== "failed";

    // Always resurface a fresh terminal failure, even if the user dismissed
    // an earlier "retrying…" notice from the same cascade - it's now
    // actionable (Retry button) rather than just informational.
    if (enteringTrouble || persistenceStatus === "failed") {
      setDismissed(false);
    }

    prevStatusRef.current = persistenceStatus;
  }, [persistenceStatus]);

  const isVisible =
    !dismissed && (persistenceStatus === "retrying" || persistenceStatus === "failed");

  if (!isVisible) return null;

  const isFailed = persistenceStatus === "failed";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--gold)] px-4 py-2.5 text-sm text-white shadow-[0_10px_30px_rgba(39,34,27,0.18)]">
        <span className="flex-1">
          {isFailed ? "Changes aren't saving." : "Couldn't save your changes — retrying…"}
        </span>
        {isFailed ? (
          <button
            type="button"
            onClick={retryPersistence}
            className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium text-white outline-none transition hover:bg-white/30"
          >
            Retry
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="grid size-6 shrink-0 place-items-center rounded-full text-white/90 outline-none transition hover:bg-white/20"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
