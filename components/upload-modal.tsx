"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, LocateFixed, MapPin, Sun, X } from "lucide-react";
import { sortByDistanceFrom } from "../lib/geo";
import { rankSearchResults } from "../lib/search-ranking";
import type { Place } from "../lib/types";

export type UploadPhotoInput = {
  file: File;
  previewUrl: string;
  placeId: string;
  caption: string;
  metadataText?: string;
  bestLight: string;
  tags: string[];
  usedCurrentLocation: boolean;
  approximateLocationLabel?: string;
};

type UploadModalProps = {
  open: boolean;
  places: Place[];
  initialPlaceId?: string;
  onClose: () => void;
  onSubmit: (input: UploadPhotoInput) => void;
};

type GeoStatus = "idle" | "locating" | "found" | "denied";

const SUGGESTION_LIMIT = 6;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function UploadModal({ open, places, initialPlaceId, onClose, onSubmit }: UploadModalProps) {
  const initialPlace = useMemo(
    () => (initialPlaceId ? places.find((place) => place.id === initialPlaceId) : undefined),
    [initialPlaceId, places],
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [placeId, setPlaceId] = useState(initialPlace?.id ?? "");
  const [locationQuery, setLocationQuery] = useState(initialPlace?.name ?? "");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[] | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [usedCurrentLocation, setUsedCurrentLocation] = useState(false);
  const [caption, setCaption] = useState("");
  const [metadataText, setMetadataText] = useState("");
  const [bestLight, setBestLight] = useState("Golden hour");
  const [tagsText, setTagsText] = useState("");
  const locationFieldRef = useRef<HTMLDivElement>(null);

  const selectedPlace = useMemo(() => places.find((place) => place.id === placeId), [places, placeId]);

  const suggestions = useMemo(() => {
    const query = locationQuery.trim();
    if (query) {
      return rankSearchResults({
        items: places,
        query,
        fields: [
          { weight: 5, getValue: (place) => [place.name] },
          { weight: 3, getValue: (place) => [place.fuzzyLocationLabel] },
          { weight: 2, getValue: (place) => [place.tags] },
        ],
        limit: SUGGESTION_LIMIT,
      });
    }
    if (nearbyPlaces) return nearbyPlaces.slice(0, SUGGESTION_LIMIT);
    return [];
  }, [locationQuery, places, nearbyPlaces]);

  useEffect(() => {
    if (initialPlace) {
      setPlaceId(initialPlace.id);
      setLocationQuery(initialPlace.name);
    }
  }, [initialPlace]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationFieldRef.current && !locationFieldRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!open) return null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setPreviewUrl("");
    if (!nextFile) return;

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(nextFile);
  }

  function chooseSuggestion(place: Place) {
    setPlaceId(place.id);
    setLocationQuery(place.name);
    setSuggestionsOpen(false);
  }

  function handleLocationQueryChange(value: string) {
    setLocationQuery(value);
    setSuggestionsOpen(true);
    if (placeId && places.find((place) => place.id === placeId)?.name !== value) {
      setPlaceId("");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }

    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = { lat: position.coords.latitude, lng: position.coords.longitude };
        setNearbyPlaces(sortByDistanceFrom(origin, places));
        setUsedCurrentLocation(true);
        setGeoStatus("found");
        setLocationQuery("");
        setPlaceId("");
        setSuggestionsOpen(true);
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  }

  function handleLocationKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      chooseSuggestion(suggestions[highlightedIndex]);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !previewUrl || !placeId || !caption.trim()) return;
    onSubmit({
      file,
      previewUrl,
      placeId,
      caption: caption.trim(),
      metadataText: metadataText.trim() || undefined,
      bestLight,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean),
      usedCurrentLocation,
      approximateLocationLabel: selectedPlace?.fuzzyLocationLabel,
    });
    setFile(null);
    setPreviewUrl("");
    setCaption("");
    setMetadataText("");
    setBestLight("Golden hour");
    setTagsText("");
    onClose();
  }

  const locationHint = geoStatus === "locating"
    ? "Finding spots near you..."
    : geoStatus === "denied"
      ? "Couldn't get your location — type a place name instead."
      : selectedPlace
        ? selectedPlace.fuzzyLocationLabel
        : geoStatus === "found"
          ? "Showing spots near you — pick one below."
          : "Type a place name, or tap the locate icon for nearby suggestions.";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/42 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] bg-[var(--paper-strong)] shadow-2xl sm:rounded-[12px]">
        <div className="flex items-center justify-between gap-4 px-7 pb-2 pt-7">
          <div>
            <h2 id="upload-title" className="text-3xl font-semibold text-[var(--ink)]">Add Photo</h2>
            <p className="mt-1 text-lg text-[var(--muted)]">Share a photo post</p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[var(--ink)] outline-none transition hover:bg-[var(--chip)]"
            aria-label="Close upload modal"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-7 pt-3">
            <label className="block">
              <span className="mb-2 block text-base text-[var(--ink)]">Photo preview</span>
              <span className={cx("relative flex min-h-72 cursor-pointer items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--chip)] outline-none transition hover:border-[var(--moss)]", previewUrl && "border-solid bg-zinc-100")}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected upload preview" className="h-full max-h-[460px] w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-sm text-[var(--muted)]">
                    <ImagePlus className="size-8" aria-hidden="true" />
                    Choose an image to preview
                  </span>
                )}
                {previewUrl ? <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white text-[var(--ink)]"><X className="size-5" /></span> : null}
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} required />
            </label>

            <div className="relative block" ref={locationFieldRef}>
              <span className="mb-2 block text-base text-[var(--ink)]">Where was this taken?</span>
              <span className="relative flex items-center">
                <MapPin className="pointer-events-none absolute left-4 size-5 text-[var(--ink)]/65" aria-hidden="true" />
                <input
                  role="combobox"
                  aria-expanded={suggestionsOpen}
                  aria-controls="location-suggestions"
                  aria-autocomplete="list"
                  value={locationQuery}
                  onChange={(event) => handleLocationQueryChange(event.target.value)}
                  onFocus={() => setSuggestionsOpen(true)}
                  onKeyDown={handleLocationKeyDown}
                  className="h-12 w-full rounded-lg border border-[var(--line)] bg-white pl-12 pr-12 text-base outline-none placeholder:text-[var(--muted)]"
                  placeholder="Start typing a place name..."
                  autoComplete="off"
                  required
                />
                <button
                  type="button"
                  aria-label="Suggest places near my current location"
                  className={cx(
                    "absolute right-2 grid size-9 place-items-center rounded-full transition",
                    usedCurrentLocation ? "bg-[var(--moss)] text-white" : "text-[var(--ink)] hover:bg-[var(--chip)]",
                  )}
                  onClick={useMyLocation}
                >
                  <LocateFixed className={cx("size-5", geoStatus === "locating" && "animate-pulse")} aria-hidden="true" />
                </button>
              </span>

              {suggestionsOpen && suggestions.length > 0 ? (
                <ul
                  id="location-suggestions"
                  role="listbox"
                  className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--line)] bg-white py-1 shadow-lg"
                >
                  {suggestions.map((place, index) => (
                    <li key={place.id} role="option" aria-selected={place.id === placeId}>
                      <button
                        type="button"
                        className={cx(
                          "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                          index === highlightedIndex ? "bg-[var(--chip)]" : "hover:bg-[var(--chip)]",
                        )}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => chooseSuggestion(place)}
                      >
                        <MapPin className="size-4 shrink-0 text-[var(--ink)]/60" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-[var(--ink)]">{place.name}</span>
                          <span className="block truncate text-xs text-[var(--muted)]">{place.fuzzyLocationLabel}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className={cx("mt-2 flex items-center gap-1 text-xs", geoStatus === "denied" ? "text-red-600" : "text-[var(--muted)]")}>
                {locationHint}
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-base text-[var(--ink)]">Caption</span>
              <input
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="h-14 w-full rounded-lg border border-[var(--line)] bg-white px-4 text-base outline-none placeholder:text-[var(--muted)]"
                placeholder="Fog lifted for six minutes"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-base text-[var(--ink)]">Best light</span>
                <span className="relative block">
                  <Sun className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--gold)]" />
                  <select
                    value={bestLight}
                    onChange={(event) => setBestLight(event.target.value)}
                    className="h-12 w-full appearance-none rounded-lg border border-[var(--line)] bg-white pl-12 pr-10 text-base outline-none"
                  >
                    {["Golden hour", "Sunrise", "Sunset", "Blue hour", "Fog", "Night", "Daylight"].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">⌄</span>
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-base text-[var(--ink)]">Camera detail</span>
                <input
                  value={metadataText}
                  onChange={(event) => setMetadataText(event.target.value)}
                  className="h-12 w-full rounded-lg border border-[var(--line)] bg-white px-4 text-base outline-none placeholder:text-[var(--muted)]"
                  placeholder="70mm, f/5.6"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-base text-[var(--ink)]">Tags</span>
              <input
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                className="h-12 w-full rounded-lg border border-[var(--line)] bg-white px-4 text-base outline-none placeholder:text-[var(--muted)]"
                placeholder="Fog, Bridge, Golden hour"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <button type="button" className="h-12 rounded-lg border border-[var(--line)] bg-white text-base" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--moss)] px-4 text-base text-white outline-none transition hover:bg-[var(--moss-dark)] disabled:cursor-not-allowed disabled:bg-zinc-300"
              disabled={!file || !caption.trim() || !placeId}
            >
              <Camera className="size-4" aria-hidden="true" />
              Publish photo
            </button>
            </div>
        </div>
      </form>
    </div>
  );
}
