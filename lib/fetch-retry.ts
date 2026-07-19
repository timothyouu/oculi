// Resilient fetch for the Mapbox proxy (app/api/mapbox/route.ts).
//
// A single map load fans out into many tile/style/sprite/glyph requests, each
// forwarded server-side to one of Mapbox's CloudFront edge IPs. When one edge
// IP is transiently unreachable (a common WSL2 <-> CloudFront blip), undici's
// default ~10s connect timeout leaves the request hanging and then throws,
// which the route would otherwise surface as an unhandled 500. This helper
// bounds each attempt with a short timeout and retries thrown network/timeout
// errors — a retry re-resolves DNS and usually lands on a healthy edge IP.
//
// It only retries *thrown* errors (network failures, aborts). An HTTP response
// is always returned as-is, including 4xx/5xx from Mapbox itself, so the
// route's existing 401/403 auth handling and status forwarding are untouched.
//
// IMPORTANT: the per-attempt timeout bounds connect + response *headers* only.
// It is cleared the moment `fetch` resolves, so it can never abort the still-
// streaming response body (callers forward `response.body` as a live stream).
// If a caller passes its own `signal`, it is *linked* to each attempt (so the
// timeout still applies) and a caller-initiated abort fails fast without retry.

export type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface FetchWithRetryOptions {
  // Total attempts made before giving up (default 3: the initial try + 2 retries).
  attempts?: number;
  // Per-attempt timeout in milliseconds, bounding connect + response headers
  // (NOT body streaming). Kept well under undici's ~10s default so a stuck edge
  // IP fails fast and frees the attempt for a retry.
  timeoutMs?: number;
  // Base delay before a retry; grows linearly per attempt (attempt 1 -> base,
  // attempt 2 -> 2*base). Keep small so tiles stay responsive.
  retryDelayMs?: number;
  // Injectable for tests and to reuse the platform fetch in production.
  fetchImpl?: FetchImpl;
  // Injectable sleep so tests don't wait on real timers.
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 6_000;
const DEFAULT_RETRY_DELAY_MS = 150;

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeAttempts(attempts: number | undefined): number {
  if (attempts === undefined) return DEFAULT_ATTEMPTS;
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError(`fetchWithRetry: attempts must be a positive integer, received ${attempts}`);
  }
  return attempts;
}

export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const attempts = normalizeAttempts(options.attempts);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const callerSignal = init.signal ?? undefined;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    // A caller-initiated abort is a deliberate cancellation, never something to
    // retry — respect it immediately.
    if (callerSignal?.aborted) {
      throw callerSignal.reason ?? new DOMException("The operation was aborted.", "AbortError");
    }

    // Own the abort per attempt: a timer we control (so it can be cleared the
    // instant headers arrive) plus a link to any caller signal.
    const controller = new AbortController();
    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
    const timer = setTimeout(() => {
      controller.abort(new DOMException(`Timed out after ${timeoutMs}ms`, "TimeoutError"));
    }, timeoutMs);

    try {
      const response = await fetchImpl(input, { ...init, signal: controller.signal });
      // Success = we have the response (headers). Clearing the timer here is what
      // guarantees it can't fire later and truncate the still-streaming body.
      return response;
    } catch (error) {
      lastError = error;
      // Fail fast on a caller-initiated cancel; only genuine network/timeout
      // errors are worth retrying.
      if (callerSignal?.aborted) throw error;
      if (attempt < attempts) {
        await sleep(retryDelayMs * attempt);
      }
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    }
  }

  throw lastError;
}
