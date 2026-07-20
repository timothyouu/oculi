import { describe, expect, it } from "vitest";
import { photos } from "./data";
import {
  attributionForPhoto,
  attributionLabel,
  deriveWikimediaCommonsUrl,
  isOptimizerAllowedSrc,
} from "./image-attribution";

describe("deriveWikimediaCommonsUrl", () => {
  it("derives the Commons file page from a thumbnail URL", () => {
    const url =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Golden_Gate_Bridge_by_night.jpg/960px-Golden_Gate_Bridge_by_night.jpg";
    expect(deriveWikimediaCommonsUrl(url)).toBe(
      "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_by_night.jpg",
    );
  });

  it("derives the Commons file page from a non-thumbnail (original) URL", () => {
    const url = "https://upload.wikimedia.org/wikipedia/commons/c/c2/Golden_Gate_Bridge_by_night.jpg";
    expect(deriveWikimediaCommonsUrl(url)).toBe(
      "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_by_night.jpg",
    );
  });

  it("decodes percent-encoded filenames (apostrophes, parens) before re-encoding", () => {
    const url =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Marshall%C2%B4s_Beach.JPG/960px-Marshall%C2%B4s_Beach.JPG";
    const result = deriveWikimediaCommonsUrl(url);
    expect(result).toContain("https://commons.wikimedia.org/wiki/File:");
    expect(result).toContain("Marshall");
    expect(result).toContain("Beach.JPG");
  });

  it("returns null for non-Wikimedia hosts", () => {
    expect(deriveWikimediaCommonsUrl("https://images.unsplash.com/photo-123")).toBeNull();
    expect(deriveWikimediaCommonsUrl("/generated/golden-gate-overlook.png")).toBeNull();
    expect(deriveWikimediaCommonsUrl("blob:http://localhost:3000/abc-123")).toBeNull();
    expect(deriveWikimediaCommonsUrl("data:image/png;base64,AAAA")).toBeNull();
  });

  it("returns null for a Wikimedia host that doesn't match the expected Commons path shape", () => {
    expect(deriveWikimediaCommonsUrl("https://upload.wikimedia.org/some/other/shape.jpg")).toBeNull();
  });

  it("returns null for non-string input", () => {
    // @ts-expect-error -- exercising defensive runtime guard against non-string input
    expect(deriveWikimediaCommonsUrl(undefined)).toBeNull();
  });
});

describe("attributionForPhoto", () => {
  const wikimediaUrl =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Golden_Gate_Bridge_by_night.jpg/960px-Golden_Gate_Bridge_by_night.jpg";

  it("prefers an explicit attribution over derivation", () => {
    const explicit = { author: "Jane Doe", license: "CC BY-SA 4.0", sourceUrl: "https://example.com" };
    expect(attributionForPhoto(wikimediaUrl, explicit)).toEqual(explicit);
  });

  it("ignores an explicit attribution object with no populated fields", () => {
    const result = attributionForPhoto(wikimediaUrl, {});
    expect(result).toEqual({ license: "Wikimedia Commons", sourceUrl: expect.stringContaining("commons.wikimedia.org") });
  });

  it("derives a Wikimedia Commons credit when no explicit attribution is given", () => {
    const result = attributionForPhoto(wikimediaUrl);
    expect(result?.license).toBe("Wikimedia Commons");
    expect(result?.sourceUrl).toContain("commons.wikimedia.org/wiki/File:");
  });

  it("returns null for non-Wikimedia photos with no explicit attribution", () => {
    expect(attributionForPhoto("/generated/golden-gate-overlook.png")).toBeNull();
    expect(attributionForPhoto("blob:http://localhost:3000/abc-123")).toBeNull();
  });
});

describe("attributionLabel", () => {
  it("joins author and license when both present", () => {
    expect(attributionLabel({ author: "Jane Doe", license: "CC BY-SA 4.0" })).toBe("Jane Doe · CC BY-SA 4.0");
  });

  it("falls back to just the license when author is absent", () => {
    expect(attributionLabel({ license: "Wikimedia Commons" })).toBe("Wikimedia Commons");
  });

  it("falls back to a generic label when neither author nor license present", () => {
    expect(attributionLabel({ sourceUrl: "https://example.com" })).toBe("Source");
  });
});

describe("isOptimizerAllowedSrc", () => {
  it("allows local public assets and allowlisted https hosts", () => {
    expect(isOptimizerAllowedSrc("/generated/golden-gate-overlook.png")).toBe(true);
    expect(isOptimizerAllowedSrc("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/x.jpg/960px-x.jpg")).toBe(true);
    expect(
      isOptimizerAllowedSrc("https://xlzknvhiuhtcqmqrypqh.supabase.co/storage/v1/object/public/oculi-photos/a/b.jpg"),
    ).toBe(true);
  });

  it("rejects blob:/data: URLs, non-https, unknown hosts, and empty strings", () => {
    expect(isOptimizerAllowedSrc("blob:http://localhost:3000/abc-123")).toBe(false);
    expect(isOptimizerAllowedSrc("data:image/png;base64,AAAA")).toBe(false);
    expect(isOptimizerAllowedSrc("http://upload.wikimedia.org/wikipedia/commons/c/c2/x.jpg")).toBe(false);
    expect(isOptimizerAllowedSrc("https://evil.example.com/x.jpg")).toBe(false);
    expect(isOptimizerAllowedSrc("")).toBe(false);
  });
});

describe("catalog integration", () => {
  it("derives a Wikimedia Commons attribution for every seed photo hosted on upload.wikimedia.org", () => {
    const wikimediaPhotos = photos.filter((photo) => photo.imageUrl.includes("upload.wikimedia.org"));
    expect(wikimediaPhotos.length).toBeGreaterThan(0);

    for (const photo of wikimediaPhotos) {
      const attribution = attributionForPhoto(photo.imageUrl, photo.attribution);
      expect(attribution).not.toBeNull();
      expect(attribution?.sourceUrl).toContain("commons.wikimedia.org/wiki/File:");
    }
  });
});
