// Pure, DOM-free retry/backoff scheduler for Supabase (or any async) writes.
// Used to surface write failures to the user instead of a silent console.warn
// (see docs/demo-to-product-audit.md item 5) while retrying automatically.

export type PersistenceStatus = "saving" | "saved" | "retrying" | "failed";

export type PersistenceStatusListener = (status: PersistenceStatus) => void;

export type RetryScheduler<T> = {
  /** Schedule a write of the latest payload, superseding any pending retry. */
  run: (payload: T) => void;
  /** Re-attempt the last payload from a terminal "failed" state (or anytime). */
  retryNow: () => void;
  /** Current status, mainly useful for tests. */
  getStatus: () => PersistenceStatus | null;
  /** Cancel any pending retry timer (e.g. on unmount). */
  dispose: () => void;
};

export type CreateRetrySchedulerOptions<T> = {
  write: (payload: T) => Promise<void>;
  onStatusChange: PersistenceStatusListener;
  /** How many retries to attempt after the first failed try. Default 3. */
  maxRetries?: number;
  /** Backoff delay (ms) before each retry attempt. Default [2000, 5000, 10000]. */
  backoffMs?: number[];
};

const DEFAULT_BACKOFF_MS = [2000, 5000, 10000];

export function createRetryScheduler<T>(
  options: CreateRetrySchedulerOptions<T>,
): RetryScheduler<T> {
  const { write, onStatusChange, maxRetries = 3, backoffMs = DEFAULT_BACKOFF_MS } = options;

  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let currentStatus: PersistenceStatus | null = null;
  let latestPayload: T | null = null;
  let hasPayload = false;
  // Incremented on every new run()/retryNow() call so stale in-flight
  // attempts (superseded by a newer write) don't clobber status afterward.
  let runToken = 0;

  function setStatus(status: PersistenceStatus) {
    currentStatus = status;
    onStatusChange(status);
  }

  function clearPendingTimer() {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function attempt(payload: T, retryCount: number, token: number) {
    setStatus(retryCount === 0 ? "saving" : "retrying");

    write(payload)
      .then(() => {
        if (token !== runToken) return;
        setStatus("saved");
      })
      .catch(() => {
        if (token !== runToken) return;

        if (retryCount >= maxRetries) {
          setStatus("failed");
          return;
        }

        const delay = backoffMs[Math.min(retryCount, backoffMs.length - 1)];
        pendingTimer = setTimeout(() => {
          pendingTimer = null;
          attempt(payload, retryCount + 1, token);
        }, delay);
      });
  }

  function startAttemptCycle(payload: T) {
    clearPendingTimer();
    runToken += 1;
    attempt(payload, 0, runToken);
  }

  return {
    run(payload: T) {
      latestPayload = payload;
      hasPayload = true;
      startAttemptCycle(payload);
    },
    retryNow() {
      if (!hasPayload) return;
      startAttemptCycle(latestPayload as T);
    },
    getStatus() {
      return currentStatus;
    },
    dispose() {
      clearPendingTimer();
      runToken += 1;
    },
  };
}
