import { describe, expect, it } from "vitest";
import {
  buildPlaceShareUrl,
  buildPlaceSharePayload,
  buildPlaceShareTargets,
} from "./share-place";
import type { Place } from "./types";

const basePlace: Place = {
  id: "golden-gate-bridge",
  areaId: "sf",
  name: "Golden Gate Bridge",
  description: "An iconic suspension bridge.",
  lat: 37.8199,
  lng: -122.4783,
  fuzzyLocationLabel: "San Francisco, CA",
  timCurated: true,
  saveCount: 42,
  recentActivityScore: 1,
  bestTimes: ["sunset"],
  tags: ["landmark"],
  coverPhotoUrl: "https://example.com/photo.jpg",
};

describe("buildPlaceShareUrl", () => {
  it("builds a /places/[placeId] URL from the given origin", () => {
    expect(buildPlaceShareUrl(basePlace, "https://oculi.app")).toBe(
      "https://oculi.app/places/golden-gate-bridge",
    );
  });
});

describe("buildPlaceSharePayload", () => {
  it("includes the name and fuzzy location label in the text", () => {
    const payload = buildPlaceSharePayload(basePlace, "https://oculi.app");

    expect(payload.title).toBe("Golden Gate Bridge");
    expect(payload.text).toBe(
      "Golden Gate Bridge — San Francisco, CA · a photo spot on Oculi",
    );
    expect(payload.url).toBe("https://oculi.app/places/golden-gate-bridge");
  });

  it("falls back to just the place name when fuzzyLocationLabel is empty", () => {
    const place: Place = { ...basePlace, fuzzyLocationLabel: "" };
    const payload = buildPlaceSharePayload(place, "https://oculi.app");

    expect(payload.text).toBe("Golden Gate Bridge");
  });
});

describe("buildPlaceShareTargets", () => {
  const payload = buildPlaceSharePayload(basePlace, "https://oculi.app");
  const targets = buildPlaceShareTargets(payload);

  it("orders targets as X, WhatsApp, Email", () => {
    expect(targets.map((target) => target.id)).toEqual(["x", "whatsapp", "email"]);
  });

  it("builds an X intent href with correctly encoded text and url", () => {
    const x = targets.find((target) => target.id === "x")!;
    expect(x.href).toBe(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.text)}&url=${encodeURIComponent(payload.url)}`,
    );
  });

  it("builds a WhatsApp href with the text and url combined and encoded", () => {
    const whatsapp = targets.find((target) => target.id === "whatsapp")!;
    expect(whatsapp.href).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${payload.text} ${payload.url}`)}`,
    );
  });

  it("builds a mailto href with encoded subject and body", () => {
    const email = targets.find((target) => target.id === "email")!;
    expect(email.href).toBe(
      `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(`${payload.text}\n\n${payload.url}`)}`,
    );
  });

  it("round-trips decoded url and text back to their original values", () => {
    const x = targets.find((target) => target.id === "x")!;
    const params = new URL(x.href.replace("https://twitter.com/intent/tweet?", "https://twitter.com/?")).searchParams;

    expect(params.get("text")).toBe(payload.text);
    expect(params.get("url")).toBe(payload.url);
  });
});
