"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, LocateFixed, MapPin, Navigation, X } from "lucide-react";
import type { Place } from "../lib/types";

export type UploadPhotoInput = {
  file: File;
  previewUrl: string;
  placeId: string;
  caption: string;
  metadataText?: string;
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
  const [tagsText, setTagsText] = useState("");
  const [locationStatus, setLocationStatus] = useState("Select a place or use an approximate SF location.");
  const [usedCurrentLocation, setUsedCurrentLocation] = useState(false);

  const selectedPlace = useMemo(() => places.find((place) => place.id === placeId), [places, placeId]);

  useEffect(() => {
    if (initialPlaceId) setPlaceId(initialPlaceId);
  }, [initialPlaceId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
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
    setTagsText("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-md bg-white shadow-2xl sm:rounded-md">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 id="upload-title" className="text-base font-semibold text-zinc-950">Add photo</h2>
            <p className="text-sm text-zinc-500">Attach the place first, camera details optional.</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-zinc-500 outline-none transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            aria-label="Close upload modal"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-900">Photo file</span>
              <span className={cx("flex min-h-72 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-zinc-50 outline-none transition hover:border-zinc-400", previewUrl && "border-solid bg-zinc-100")}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected upload preview" className="h-full max-h-[460px] w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-sm text-zinc-500">
                    <ImagePlus className="size-8" aria-hidden="true" />
                    Choose an image to preview
                  </span>
                )}
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} required />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-900">Caption</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="min-h-24 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                placeholder="What should someone know before shooting here?"
                required
              />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="upload-place" className="mb-2 block text-sm font-medium text-zinc-900">Place</label>
              <select
                id="upload-place"
                value={placeId}
                onChange={(event) => setPlaceId(event.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                required
              >
                {places.map((place) => (
                  <option key={place.id} value={place.id}>{place.name}</option>
                ))}
              </select>
              {selectedPlace ? (
                <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {selectedPlace.fuzzyLocationLabel}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                onClick={useCurrentLocation}
              >
                <LocateFixed className="size-4" aria-hidden="true" />
                Current
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                onClick={handleSimulatedLocation}
              >
                <Navigation className="size-4" aria-hidden="true" />
                Simulate
              </button>
            </div>
            <p className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">{locationStatus}</p>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-900">Tags</span>
              <input
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                placeholder="golden hour, skyline, portrait"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-900">Camera notes</span>
              <textarea
                value={metadataText}
                onChange={(event) => setMetadataText(event.target.value)}
                className="min-h-20 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                placeholder="Optional lens, camera, settings, edit notes"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white outline-none transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
              disabled={!file || !caption.trim() || !placeId}
            >
              <Camera className="size-4" aria-hidden="true" />
              Add to feed
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
