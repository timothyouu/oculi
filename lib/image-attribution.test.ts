import { describe, expect, it } from "vitest";
import { attributionForImageUrl, shouldBypassImageOptimizer } from "./image-attribution";

describe("attributionForImageUrl", () => {
  it("derives the Commons File: page from a thumbnail Wikimedia URL", () => {
    const result = attributionForImageUrl(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/960px-GoldenGateBridge-001.jpg",
    );
    expect(result).toEqual({
      label: "via Wikimedia Commons",
      href: "https://commons.wikimedia.org/wiki/File:GoldenGateBridge-001.jpg",
    });
  });

  it("derives the Commons File: page from a non-thumbnail Wikimedia URL", () => {
    const result = attributionForImageUrl(
      "https://upload.wikimedia.org/wikipedia/commons/a/ab/Some_File_Name.jpg",
    );
    expect(result).toEqual({
      label: "via Wikimedia Commons",
      href: "https://commons.wikimedia.org/wiki/File:Some_File_Name.jpg",
    });
  });

  it("attributes Unsplash-hosted images to Unsplash", () => {
    const result = attributionForImageUrl(
      "https://images.unsplash.com/photo-1234567890?auto=format&fit=crop&w=1200",
    );
    expect(result).toEqual({ label: "via Unsplash", href: "https://unsplash.com/" });
  });

  it("returns null for Oculi's own Supabase storage uploads", () => {
    const result = attributionForImageUrl(
      "https://xlzknvhiuhtcqmqrypqh.supabase.co/storage/v1/object/public/oculi-photos/user-guest/upload-abc123.jpg",
    );
    expect(result).toBeNull();
  });

  it("returns null for local/generated demo asset paths", () => {
    expect(attributionForImageUrl("/generated/golden-gate-overlook.png")).toBeNull();
  });

  it("returns null for transient blob preview URLs", () => {
    expect(attributionForImageUrl("blob:https://oculi-demo.vercel.app/8f2c1e1e-1234-4a2b-9999-abcdef012345")).toBeNull();
  });

  it("returns null for data URLs", () => {
    expect(attributionForImageUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(attributionForImageUrl("")).toBeNull();
  });
});

describe("shouldBypassImageOptimizer", () => {
  it("bypasses the optimizer for Wikimedia-hosted images (429 rate-limits the server-side proxy)", () => {
    expect(
      shouldBypassImageOptimizer(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/960px-GoldenGateBridge-001.jpg",
      ),
    ).toBe(true);
  });

  it("keeps optimization for own Supabase storage uploads", () => {
    expect(
      shouldBypassImageOptimizer(
        "https://xlzknvhiuhtcqmqrypqh.supabase.co/storage/v1/object/public/oculi-photos/user-guest/upload-abc123.jpg",
      ),
    ).toBe(false);
  });

  it("keeps optimization for local asset paths", () => {
    expect(shouldBypassImageOptimizer("/generated/golden-gate-overlook.png")).toBe(false);
  });
});
