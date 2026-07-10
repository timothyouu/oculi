// Simple fixed-window, in-memory rate limiter.
//
// Serverless caveat: on Vercel each function instance has its own memory, and
// instances can be recycled or scaled out at any time. This limiter is therefore
// best-effort abuse damping (deters a single runaway client hammering one
// instance) rather than a hard, globally-accurate quota. A real quota would need
// a shared store (e.g. Redis/Upstash).

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimiterOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max number of allowed requests per key within a window. */
  max: number;
  /** Injectable clock, defaults to Date.now. Useful for tests. */
  now?: () => number;
}

interface WindowState {
  count: number;
  windowStart: number;
}

export function createRateLimiter({ windowMs, max, now = Date.now }: RateLimiterOptions) {
  const state = new Map<string, WindowState>();

  function check(key: string): RateLimitResult {
    const currentTime = now();
    const existing = state.get(key);

    if (!existing || currentTime - existing.windowStart >= windowMs) {
      state.set(key, { count: 1, windowStart: currentTime });
      return { allowed: true };
    }

    if (existing.count < max) {
      existing.count += 1;
      return { allowed: true };
    }

    const windowEnd = existing.windowStart + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((windowEnd - currentTime) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { check };
}
