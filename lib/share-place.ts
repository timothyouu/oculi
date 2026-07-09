import type { Place } from "./types";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

export type ShareTarget = {
  id: "x" | "whatsapp" | "email";
  label: string;
  href: string;
};

export function buildPlaceShareUrl(place: Place, origin: string): string {
  return `${origin}/places/${place.id}`;
}

export function buildPlaceSharePayload(place: Place, origin: string): SharePayload {
  const text = place.fuzzyLocationLabel
    ? `${place.name} — ${place.fuzzyLocationLabel} · a photo spot on Oculi`
    : place.name;

  return {
    title: place.name,
    text,
    url: buildPlaceShareUrl(place, origin),
  };
}

export function buildPlaceShareTargets(payload: SharePayload): ShareTarget[] {
  const { title, text, url } = payload;

  return [
    {
      id: "x",
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      id: "whatsapp",
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      id: "email",
      label: "Share via Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    },
  ];
}
