"use client";

import { useMemo, useState } from "react";
import { Bookmark, Check, Grid2X2, Heart, MapPin, X } from "lucide-react";
import { useDemoState } from "@/lib/demo-state";
import { formatPlaceLocation } from "@/lib/location-labels";
import type { EditableProfile } from "@/lib/types";
import type { Photo, Place, User } from "../lib/types";

type ProfileSummaryProps = {
  user: User;
  photos?: Photo[];
  savedPlaces?: Place[];
  isCurrentUser?: boolean;
  isFollowed?: boolean;
  onToggleFollow?: (userId: string) => void;
  onOpenPlace?: (placeId: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ProfileSummary({
  user,
  photos = [],
  savedPlaces = [],
  isCurrentUser = false,
  isFollowed = false,
  onToggleFollow,
  onOpenPlace,
}: ProfileSummaryProps) {
  const { areas, photos: allPhotos, places, state, updateProfile } = useDemoState();
  const [activeTab, setActiveTab] = useState<"Photos" | "Saved">("Photos");
  const [status, setStatus] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const favoriteTags = useMemo(() => {
    if (isCurrentUser) return state.profile.favoriteTags;

    const counts = new Map<string, number>();
    allPhotos
      .filter((photo) => photo.userId === user.id)
      .forEach((photo) => photo.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 4);
  }, [allPhotos, isCurrentUser, state.profile.favoriteTags, user.id]);
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    places.forEach((place) => place.tags.forEach((tag) => tags.add(tag.toLowerCase())));
    allPhotos.forEach((photo) => photo.tags.forEach((tag) => tags.add(tag.toLowerCase())));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [allPhotos, places]);
  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [photos],
  );

  return (
    <section className="space-y-8">
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-strong)] p-8 shadow-[0_16px_42px_rgba(39,34,27,0.08)]">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)_170px]">
          <div className="space-y-6">
            <img
              src={user.avatarUrl}
              alt=""
              className="size-52 rounded-full bg-zinc-200 object-cover shadow-sm max-sm:size-32"
            />
            <FavoriteTags tags={favoriteTags} />
          </div>
          <div className="space-y-5">
            <div>
              <h1 className="text-5xl font-semibold tracking-tight text-[var(--ink)] max-sm:text-3xl">{user.name}</h1>
              <p className="mt-2 text-lg text-[var(--muted)]">{user.username}</p>
            </div>
            <p className="max-w-xl text-lg leading-7 text-[var(--ink)]/78">{user.bio}</p>
            <p className="flex items-center gap-2 text-base text-[var(--ink)]/75"><MapPin className="size-5" />{user.homeArea}</p>
            <div className="grid max-w-sm grid-cols-2 divide-x divide-[var(--line)]">
              <div>
                <p className="text-2xl font-semibold">{user.followerCount.toLocaleString()}</p>
                <p className="text-[var(--muted)]">followers</p>
              </div>
              <div className="pl-12">
                <p className="text-2xl font-semibold">{user.followingCount.toLocaleString()}</p>
                <p className="text-[var(--muted)]">following</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {!isCurrentUser ? (
              <button
                type="button"
                className={cx(
                  "inline-flex h-12 w-full items-center justify-center rounded-lg text-base outline-none transition",
                  isFollowed ? "bg-[var(--moss)] text-white" : "bg-[var(--moss)] text-white",
                )}
                onClick={() => onToggleFollow?.(user.id)}
              >
                {isFollowed ? "Following" : "Follow"}
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-base outline-none transition hover:bg-[var(--chip)]"
              onClick={() => {
                if (isCurrentUser) setEditOpen(true);
                else setStatus("Profile link ready for the demo.");
              }}
            >
              {isCurrentUser ? "Edit profile" : "Share profile"}
            </button>
            {status ? <p className="text-sm text-[var(--moss)]">{status}</p> : null}
          </div>
        </div>
      </div>

      <div className="flex gap-16 border-b border-[var(--line)] px-1">
        {[[Grid2X2, "Photos"], [Bookmark, "Saved"]].map(([Icon, label]) => {
          const TypedIcon = Icon as typeof Grid2X2;
          return (
            <button
              key={label as string}
              type="button"
              onClick={() => setActiveTab(label as typeof activeTab)}
              className={`flex items-center gap-3 border-b-2 px-6 py-4 text-base ${activeTab === label ? "border-[var(--moss)] text-[var(--moss)]" : "border-transparent text-[var(--ink)]"}`}
            >
              <TypedIcon className="size-5" />{label as string}
            </button>
          );
        })}
      </div>

      {activeTab === "Photos" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedPhotos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-left shadow-[0_10px_24px_rgba(39,34,27,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(39,34,27,0.1)]"
              onClick={() => onOpenPlace?.(photo.placeId)}
            >
              <img src={photo.imageUrl} alt={photo.caption} className="aspect-[16/11] w-full object-cover" />
              <span className="block space-y-3 p-4">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-[var(--ink)]">
                      {placesById.get(photo.placeId)?.name ?? photo.locationLabel}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted)]">
                      <MapPin className="size-4 shrink-0" />
                      <span className="truncate">{photo.locationLabel}</span>
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--chip)] px-2.5 py-1 text-sm text-[var(--ink)]/75">
                    <Heart className="size-4" />
                    {photo.likeCount}
                  </span>
                </span>
                <span className="block text-sm leading-5 text-[var(--ink)]/78">{photo.caption}</span>
                <span className="flex flex-wrap gap-2">
                  {photo.shotAtTimeOfDay ? (
                    <span className="rounded-full bg-[var(--moss)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--moss)]">
                      {photo.shotAtTimeOfDay}
                    </span>
                  ) : null}
                  {photo.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs capitalize text-[var(--ink)]/70">
                      {tag}
                    </span>
                  ))}
                </span>
                {photo.metadataText ? <span className="block text-xs text-[var(--muted)]">{photo.metadataText}</span> : null}
              </span>
            </button>
          ))}
          {!sortedPhotos.length ? <p className="col-span-full rounded-lg border border-dashed border-[var(--line)] p-6 text-[var(--muted)]">No uploaded photos yet.</p> : null}
        </div>
      ) : null}

      {activeTab === "Saved" && savedPlaces.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Saved places</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {savedPlaces.slice(0, 4).map((place) => (
              <button key={place.id} type="button" className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-4 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-left" onClick={() => onOpenPlace?.(place.id)}>
                <img src={place.coverPhotoUrl} alt="" className="aspect-[4/3] rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-base text-[var(--ink)]">{place.name}</span>
                  <span className="block truncate text-sm text-[var(--muted)]">{formatPlaceLocation(place, areas)}</span>
                </span>
                <Bookmark className="size-5 fill-[var(--gold)] text-[var(--gold)]" />
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {activeTab === "Saved" && !savedPlaces.length ? (
        <p className="rounded-lg border border-dashed border-[var(--line)] p-6 text-[var(--muted)]">No public saved places to show yet.</p>
      ) : null}
      {editOpen ? (
        <EditProfileModal
          profile={state.profile}
          availableTags={availableTags}
          onClose={() => setEditOpen(false)}
          onSave={(profile) => {
            updateProfile(profile);
            setEditOpen(false);
            setStatus("Profile updated.");
          }}
        />
      ) : null}
    </section>
  );
}

function FavoriteTags({ tags }: { tags: string[] }) {
  return (
    <div>
      <p className="mb-3 text-base font-semibold">Favorite tags</p>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[var(--chip)] px-5 py-2 text-sm capitalize text-[var(--ink)]/80">{tag}</span>
        ))}
        {!tags.length ? <span className="text-sm text-[var(--muted)]">No favorite tags yet.</span> : null}
      </div>
    </div>
  );
}

function EditProfileModal({
  profile,
  availableTags,
  onClose,
  onSave,
}: {
  profile: EditableProfile;
  availableTags: string[];
  onClose: () => void;
  onSave: (profile: EditableProfile) => void;
}) {
  const [draft, setDraft] = useState<EditableProfile>(() => ({
    ...profile,
    favoriteTags: [...profile.favoriteTags],
  }));
  const [customTag, setCustomTag] = useState("");
  const selected = new Set(draft.favoriteTags);
  const profileTags = availableTags.slice(0, 32);

  const updateField = (field: keyof EditableProfile, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };
  const toggleTag = (tag: string) => {
    setDraft((prev) => ({
      ...prev,
      favoriteTags: selected.has(tag)
        ? prev.favoriteTags.filter((item) => item !== tag)
        : [...prev.favoriteTags, tag].slice(0, 8),
    }));
  };
  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (!tag) return;
    setDraft((prev) => ({
      ...prev,
      favoriteTags: Array.from(new Set([...prev.favoriteTags, tag])).slice(0, 8),
    }));
    setCustomTag("");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
      <div className="max-h-[min(760px,calc(100vh-3rem))] w-full max-w-2xl overflow-auto rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-5 text-[var(--ink)]" style={{ boxShadow: "var(--elevated-shadow)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="edit-profile-title" className="text-xl font-semibold">Edit profile</p>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Update how your Oculi profile looks and what tag updates you receive.</p>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-[var(--chip)]" aria-label="Close edit profile" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)]">
          <div className="space-y-3">
            <img src={draft.avatarUrl} alt="" className="size-28 rounded-full bg-[var(--chip)] object-cover ring-1 ring-[var(--line)]" />
            <p className="text-xs leading-5 text-[var(--muted)]">Paste an image URL to change the demo avatar.</p>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Name
              <input className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-normal text-[var(--ink)]" value={draft.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Username
              <input className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-normal text-[var(--ink)]" value={draft.username} onChange={(event) => updateField("username", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Avatar URL
              <input className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-normal text-[var(--ink)]" value={draft.avatarUrl} onChange={(event) => updateField("avatarUrl", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Home area
              <input className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-normal text-[var(--ink)]" value={draft.homeArea} onChange={(event) => updateField("homeArea", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Bio
              <textarea className="min-h-24 resize-y rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-normal leading-6 text-[var(--ink)]" value={draft.bio} onChange={(event) => updateField("bio", event.target.value)} />
            </label>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Favorite tags</legend>
          <p className="mt-1 text-sm text-[var(--muted)]">These drive your notification updates. Choose up to 8.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profileTags.map((tag) => {
              const isSelected = selected.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm capitalize outline-none transition",
                    isSelected
                      ? "border-[var(--moss)] bg-[var(--moss)] text-white"
                      : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--chip)]",
                  )}
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag)}
                >
                  {isSelected ? <Check className="size-3.5" aria-hidden="true" /> : null}
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]"
              placeholder="Add custom tag"
              value={customTag}
              onChange={(event) => setCustomTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomTag();
                }
              }}
            />
            <button type="button" className="rounded-md border border-[var(--line)] px-4 py-2 text-sm hover:bg-[var(--chip)]" onClick={addCustomTag}>
              Add
            </button>
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="h-11 rounded-lg border border-[var(--line)] px-5 hover:bg-[var(--chip)]" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="h-11 rounded-lg bg-[var(--moss)] px-5 text-white" onClick={() => onSave(draft)}>
            Save profile
          </button>
        </div>
      </div>
    </div>
  );
}
