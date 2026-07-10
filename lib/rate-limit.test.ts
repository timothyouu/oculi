import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 3 });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("blocks requests over the limit within the same window", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2 });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the count once the window expires", () => {
    let currentTime = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => currentTime });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);

    currentTime = 1000;
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("isolates limits per key", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(false);
  });

  it("computes a sensible retryAfterSeconds bounded by the window", () => {
    let currentTime = 0;
    const limiter = createRateLimiter({ windowMs: 5000, max: 1, now: () => currentTime });

    expect(limiter.check("a").allowed).toBe(true);
    currentTime = 4000;
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });
});
