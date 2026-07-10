import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRetryScheduler } from "./persistence-status";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createRetryScheduler", () => {
  it("reports saving then saved on a successful write", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const statuses: string[] = [];
    const scheduler = createRetryScheduler<number>({
      write,
      onStatusChange: (status) => statuses.push(status),
    });

    scheduler.run(1);
    expect(statuses).toEqual(["saving"]);

    await vi.runOnlyPendingTimersAsync();
    // Flush the write() promise microtask queue.
    await Promise.resolve();
    await Promise.resolve();

    expect(write).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["saving", "saved"]);
  });

  it("retries with the configured backoff schedule on failure, then recovers", async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);
    const statuses: string[] = [];
    const scheduler = createRetryScheduler<number>({
      write,
      onStatusChange: (status) => statuses.push(status),
      backoffMs: [2000, 5000, 10000],
    });

    scheduler.run(1);
    await flushMicrotasks();
    expect(statuses).toEqual(["saving"]);
    expect(write).toHaveBeenCalledTimes(1);

    // Before the 2s backoff elapses, no retry yet.
    await vi.advanceTimersByTimeAsync(1999);
    expect(write).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await flushMicrotasks();
    expect(statuses).toEqual(["saving", "retrying"]);
    expect(write).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5000);
    await flushMicrotasks();
    expect(statuses).toEqual(["saving", "retrying", "retrying", "saved"]);
    expect(write).toHaveBeenCalledTimes(3);
  });

  it("transitions to terminal failed after exhausting all retries", async () => {
    const write = vi.fn().mockRejectedValue(new Error("network"));
    const statuses: string[] = [];
    const scheduler = createRetryScheduler<number>({
      write,
      onStatusChange: (status) => statuses.push(status),
      maxRetries: 3,
      backoffMs: [2000, 5000, 10000],
    });

    scheduler.run(1);
    await flushMicrotasks(); // initial attempt fails

    await vi.advanceTimersByTimeAsync(2000);
    await flushMicrotasks(); // retry 1 fails

    await vi.advanceTimersByTimeAsync(5000);
    await flushMicrotasks(); // retry 2 fails

    await vi.advanceTimersByTimeAsync(10000);
    await flushMicrotasks(); // retry 3 fails -> terminal

    expect(write).toHaveBeenCalledTimes(4);
    expect(statuses).toEqual(["saving", "retrying", "retrying", "retrying", "failed"]);
  });

  it("retryNow() re-attempts the last payload from a terminal failed state", async () => {
    const write = vi
      .fn()
      .mockRejectedValue(new Error("network"));
    const statuses: string[] = [];
    const scheduler = createRetryScheduler<number>({
      write,
      onStatusChange: (status) => statuses.push(status),
      maxRetries: 1,
      backoffMs: [2000],
    });

    scheduler.run(42);
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(2000);
    await flushMicrotasks();
    expect(statuses).toEqual(["saving", "retrying", "failed"]);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith(42);

    write.mockResolvedValueOnce(undefined);
    scheduler.retryNow();
    await flushMicrotasks();

    expect(write).toHaveBeenCalledTimes(3);
    expect(write).toHaveBeenLastCalledWith(42);
    expect(statuses).toEqual(["saving", "retrying", "failed", "saving", "saved"]);
  });

  it("a new run() supersedes a pending retry so a stale failure can't overwrite a fresh success", async () => {
    const write = vi.fn();
    const statuses: string[] = [];
    const scheduler = createRetryScheduler<number>({
      write,
      onStatusChange: (status) => statuses.push(status),
      backoffMs: [2000, 5000, 10000],
    });

    write.mockRejectedValueOnce(new Error("network"));
    scheduler.run(1);
    await flushMicrotasks();
    expect(statuses).toEqual(["saving"]);

    // A newer write comes in before the retry timer fires (e.g. the user
    // liked another photo). It should immediately supersede the old cycle.
    write.mockResolvedValueOnce(undefined);
    scheduler.run(2);
    await flushMicrotasks();

    expect(write).toHaveBeenLastCalledWith(2);
    expect(statuses).toEqual(["saving", "saving", "saved"]);

    // Advancing time must not resurrect the superseded retry.
    await vi.advanceTimersByTimeAsync(20000);
    await flushMicrotasks();
    expect(write).toHaveBeenCalledTimes(2);
    expect(statuses).toEqual(["saving", "saving", "saved"]);
  });

  it("retryNow() is a no-op before any payload has been run", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const statuses: string[] = [];
    const scheduler = createRetryScheduler<number>({ write, onStatusChange: (s) => statuses.push(s) });

    scheduler.retryNow();
    await flushMicrotasks();

    expect(write).not.toHaveBeenCalled();
    expect(statuses).toEqual([]);
  });
});

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
