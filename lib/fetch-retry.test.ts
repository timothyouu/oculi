import { describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "./fetch-retry";

const noSleep = () => Promise.resolve();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function okResponse(status = 200) {
  return new Response("ok", { status });
}

describe("fetchWithRetry", () => {
  it("returns the response on the first successful attempt without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());

    const res = await fetchWithRetry("https://api.mapbox.com/", {}, { fetchImpl, sleep: noSleep });

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries thrown network errors and succeeds on a later attempt", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("connect timeout"))
      .mockRejectedValueOnce(new Error("connect timeout"))
      .mockResolvedValue(okResponse());

    const res = await fetchWithRetry("https://api.mapbox.com/", {}, { fetchImpl, sleep: noSleep });

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry HTTP error responses (e.g. 401/403/500 from Mapbox)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(401));

    const res = await fetchWithRetry("https://api.mapbox.com/", {}, { fetchImpl, sleep: noSleep });

    expect(res.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws the last error after exhausting all attempts", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("connect timeout"));

    await expect(
      fetchWithRetry("https://api.mapbox.com/", {}, { attempts: 3, fetchImpl, sleep: noSleep }),
    ).rejects.toThrow("connect timeout");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("passes an abort signal to fetch on each attempt", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());

    await fetchWithRetry("https://api.mapbox.com/", {}, { fetchImpl, sleep: noSleep });

    const init = fetchImpl.mock.calls[0][1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // Regression for the streaming-body truncation bug: once fetch resolves the
  // per-attempt timeout must be cleared so it can never abort the live body.
  it("clears the per-attempt timeout once the response resolves (no post-success abort)", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn().mockImplementation((_input, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return Promise.resolve(okResponse());
    });

    await fetchWithRetry("https://api.mapbox.com/", {}, { fetchImpl, timeoutMs: 5, sleep: noSleep });

    // Well past the 5ms timeout: if the timer weren't cleared on success it
    // would have aborted the signal (and thus the streaming body) by now.
    await wait(25);
    expect(capturedSignal?.aborted).toBe(false);
  });

  // Finding #2: a caller-initiated abort is a deliberate cancel, not a network
  // blip — it must fail fast without spending retries.
  it("fails fast (no fetch call, no retries) when the caller's signal is already aborted", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchWithRetry("https://api.mapbox.com/", { signal: controller.signal }, { fetchImpl, sleep: noSleep }),
    ).rejects.toBeDefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("links a caller signal to the attempt rather than replacing it (still applies its own timeout signal)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());
    const controller = new AbortController();

    await fetchWithRetry(
      "https://api.mapbox.com/",
      { signal: controller.signal },
      { fetchImpl, sleep: noSleep },
    );

    const forwarded = fetchImpl.mock.calls[0][1].signal;
    expect(forwarded).toBeInstanceOf(AbortSignal);
    // It's a fresh linked signal, not the caller's own object.
    expect(forwarded).not.toBe(controller.signal);
  });

  // Finding #3: invalid attempts must surface, not silently coerce to NaN/0.
  it("throws RangeError for non-positive-integer attempts", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());

    await expect(
      fetchWithRetry("https://api.mapbox.com/", {}, { attempts: 0, fetchImpl, sleep: noSleep }),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      fetchWithRetry("https://api.mapbox.com/", {}, { attempts: Number.NaN, fetchImpl, sleep: noSleep }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
