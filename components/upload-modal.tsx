"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, LocateFixed, MapPin, Search, Sun, X } from "lucide-react";
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function UploadModal({ open, places, initialPlaceId, onClose, onSubmit }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [placeId, setPlaceId] = useState(initialPlaceId || places[0]?.id || "");
  const [caption, setCaption] = useState("");
  const [metadataText, setMetadataText] = useState("");
  const [bestLight, setBestLight] = useState("Golden hour");
  const [tagsText, setTagsText] = useState("");
  const [locationStatus, setLocationStatus] = useState("Select a place or use an approximate SF location.");
  const [usedCurrentLocation, setUsedCurrentLocation] = useState(false);

  const selectedPlace = useMemo(() => places.find((place) => place.id === placeId), [places, placeId]);

  useEffect(() => {
    if (initialPlaceId) setPlaceId(initialPlaceId);
  }, [initialPlaceId]);

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

  function handleSimulatedLocation() {
    setUsedCurrentLocation(false);
    setLocationStatus("Using simulated San Francisco location for the demo.");
    if (!placeId && places[0]) setPlaceId(places[0].id);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      handleSimulatedLocation();
      return;
    }

    setLocationStatus("Requesting browser location...");
    navigator.geolocation.getCurrentPosition(
      () => {
        setUsedCurrentLocation(true);
        setLocationStatus("Using approximate current area. Pick the closest seeded spot before posting.");
      },
      () => handleSimulatedLocation(),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/42 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] bg-[var(--paper-strong)] shadow-2xl sm:rounded-[12px]">
        <div className="flex items-center justify-between gap-4 px-7 pb-2 pt-7">
          <div>
            <h2 id="upload-title" className="text-3xl font-semibold text-[var(--ink)]">Add Photo</h2>
            <p className="mt-1 text-lg text-[var(--muted)]">Upload field note</p>
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

            <label className="block">
              <span className="mb-2 block text-base text-[var(--ink)]">Choose a place</span>
              <span className="relative block">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--ink)]/65" />
                <select
                  id="upload-place"
                  value={placeId}
                  onChange={(event) => setPlaceId(event.target.value)}
                  className="h-12 w-full appearance-none rounded-lg border border-[var(--line)] bg-white pl-12 pr-10 text-base outline-none"
                  required
                >
                  {places.map((place) => (
                    <option key={place.id} value={place.id}>{place.name}</option>
                  ))}
                </select>
              </span>
              {selectedPlace ? (
                <p className="mt-2 flex items-center gap-1 text-xs text-[var(--muted)]">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {selectedPlace.fuzzyLocationLabel}
                </p>
              ) : null}
            </label>

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
                <span className="mb-2 block text-base text-[var(--ink)]">Lens / notes</span>
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

            <button type="button" className="flex h-12 w-full items-center justify-between rounded-lg border border-[var(--line)] bg-white px-4 text-base" onClick={useCurrentLocation}>
              <span className="flex items-center gap-2"><LocateFixed className="size-5" />Use current location</span>
              <span className={cx("h-6 w-10 rounded-full p-0.5 transition", usedCurrentLocation ? "bg-[var(--moss)]" : "bg-[var(--chip)]")}>
                <span className={cx("block size-5 rounded-full bg-white transition", usedCurrentLocation && "translate-x-4")} />
              </span>
            </button>
            <p className="text-xs leading-5 text-[var(--muted)]">{locationStatus}</p>

            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <button type="button" className="h-12 rounded-lg border border-[var(--line)] bg-white text-base" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--moss)] px-4 text-base text-white outline-none transition hover:bg-[var(--moss-dark)] disabled:cursor-not-allowed disabled:bg-zinc-300"
              disabled={!file || !caption.trim() || !placeId}
            >
              <Camera className="size-4" aria-hidden="true" />
              Publish field note
            </button>
            </div>
        </div>
      </form>
    </div>
  );
}
