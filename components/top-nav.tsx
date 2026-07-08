"use client";

import { useMemo, useState } from "react";
import { Bell, Camera, Check, Moon, Plus, Settings, Sparkles, Sun, Tag, Type, UserRound } from "lucide-react";
import { useAppSettings } from "@/components/app-settings";
import { useDemoState } from "@/lib/demo-state";
import type { User } from "../lib/types";

type NavItem = {
  id: string;
  label: string;
  href?: string;
};

type TopNavProps = {
  areaLabel?: string;
  activeItem?: string;
  navItems?: NavItem[];
  currentUser?: User;
  savedCount?: number;
  onNavigate?: (item: NavItem) => void;
  onOpenUpload?: () => void;
  onOpenSaved?: () => void;
  onOpenProfile?: (userId: string) => void;
  className?: string;
};

const defaultNavItems: NavItem[] = [
  { id: "discover", label: "Discover", href: "/" },
  { id: "map", label: "Map", href: "/map" },
  { id: "saved", label: "Saved", href: "/saved" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const themeOptions = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
] as const;

const fontSizeOptions = [
  { id: "comfortable", label: "Default", sample: "Aa" },
  { id: "large", label: "Large", sample: "Aa" },
  { id: "extra-large", label: "Extra large", sample: "Aa" },
] as const;

function formatRelativeDate(value: string) {
  const then = new Date(value).getTime();
  const now = Date.now();
  const hours = Math.max(1, Math.round((now - then) / 36e5));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function SettingsPanel({ onClose }: { onClose?: () => void }) {
  const { themeMode, fontSize, setThemeMode, setFontSize, resetSettings } = useAppSettings();

  return (
    <div
      className="z-50 w-[min(21rem,calc(100vw-2.5rem))] rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-4 text-[var(--ink)]"
      style={{ boxShadow: "var(--elevated-shadow)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Settings</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Tune Oculi for where you are browsing.</p>
        </div>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs text-[var(--muted)] outline-none hover:bg-[var(--chip)] hover:text-[var(--ink)]"
          onClick={() => {
            resetSettings();
            onClose?.();
          }}
        >
          Reset
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <fieldset>
          <legend className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            <Sun className="size-3.5" aria-hidden="true" />
            Theme
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = themeMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cx(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-sm outline-none transition",
                    selected
                      ? "border-[var(--moss)] bg-[var(--chip)] text-[var(--ink)]"
                      : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]",
                  )}
                  aria-pressed={selected}
                  onClick={() => setThemeMode(option.id)}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </span>
                  {selected ? <Check className="size-4 text-[var(--moss)]" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            <Type className="size-3.5" aria-hidden="true" />
            Font size
          </legend>
          <div className="space-y-2">
            {fontSizeOptions.map((option) => {
              const selected = fontSize === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cx(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left outline-none transition",
                    selected
                      ? "border-[var(--moss)] bg-[var(--chip)] text-[var(--ink)]"
                      : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]",
                  )}
                  aria-pressed={selected}
                  onClick={() => setFontSize(option.id)}
                >
                  <span className="text-sm">{option.label}</span>
                  <span
                    className={cx(
                      "font-semibold",
                      option.id === "large" && "text-base",
                      option.id === "extra-large" && "text-lg",
                    )}
                  >
                    {selected ? <Check className="size-4 text-[var(--moss)]" aria-hidden="true" /> : option.sample}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export function TopNav({
  activeItem = "discover",
  navItems = defaultNavItems,
  currentUser,
  savedCount = 0,
  onNavigate,
  onOpenUpload,
  onOpenSaved,
  onOpenProfile,
  className,
}: TopNavProps) {
  const demo = useDemoState();
  const allNavItems = [...navItems, { id: "add", label: "Add Photo" }];
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const notifications = useMemo(() => {
    const followed = new Set(demo.followedUserIds);
    const favoriteTags = new Set(demo.state.profile.favoriteTags.map((tag) => tag.toLowerCase()));
    const currentUserPhotoIds = new Set(demo.state.uploadedPhotos.map((photo) => photo.id));
    const byDate = [...demo.photos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const followedPosts = byDate
      .filter((photo) => followed.has(photo.userId) && !currentUserPhotoIds.has(photo.id))
      .slice(0, 3)
      .map((photo) => {
        const user = demo.users.find((item) => item.id === photo.userId);
        const place = demo.places.find((item) => item.id === photo.placeId);
        return {
          id: `follow-${photo.id}`,
          icon: Camera,
          title: `${user?.name ?? "Someone you follow"} posted at ${place?.name ?? photo.locationLabel}`,
          body: photo.caption,
          meta: formatRelativeDate(photo.createdAt),
        };
      });
    const tagUpdates = byDate
      .filter((photo) => !followed.has(photo.userId) && photo.tags.some((tag) => favoriteTags.has(tag.toLowerCase())))
      .slice(0, 2)
      .map((photo) => {
        const matchedTag = photo.tags.find((tag) => favoriteTags.has(tag.toLowerCase())) ?? photo.tags[0];
        const place = demo.places.find((item) => item.id === photo.placeId);
        return {
          id: `tag-${photo.id}`,
          icon: Tag,
          title: `New ${matchedTag} update near ${place?.name ?? photo.locationLabel}`,
          body: photo.caption,
          meta: "Favorite tag",
        };
      });

    return [
      ...followedPosts,
      ...tagUpdates,
      {
        id: "saved",
        icon: Sparkles,
        title: `${savedCount} saved places are ready for planning`,
        body: "Use Saved to turn them into a morning or sunset route.",
        meta: "Shoot list",
      },
    ].slice(0, 6);
  }, [demo.followedUserIds, demo.photos, demo.places, demo.state.profile.favoriteTags, demo.state.uploadedPhotos, demo.users, savedCount]);

  return (
    <header className={cx("sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--nav-bg)] backdrop-blur-xl", className)}>
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1320px] items-center gap-3 px-5 sm:px-8">
        <button
          type="button"
          className="group flex shrink-0 items-center gap-3 rounded-md text-left outline-none"
          aria-label="Go to Oculi discover feed"
          onClick={() => onNavigate?.({ id: "discover", label: "Discover", href: "/" })}
        >
          <span className="oculi-logo-mark" aria-hidden="true" />
          <span className="text-[28px] font-semibold tracking-tight text-[var(--ink)]">oculi</span>
        </button>

        <nav className="absolute bottom-0 left-1/2 top-0 hidden -translate-x-1/2 items-center gap-8 md:flex" aria-label="Primary navigation">
          {allNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(
                "relative flex h-full items-center px-2 text-base text-[var(--ink)] outline-none transition hover:text-[var(--moss)]",
                activeItem === item.id && "text-[var(--moss)]",
              )}
              aria-current={activeItem === item.id ? "page" : undefined}
              onClick={() => {
                if (item.id === "saved") onOpenSaved?.();
                else if (item.id === "add") onOpenUpload?.();
                else onNavigate?.(item);
              }}
            >
              {item.label}
              {activeItem === item.id ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--moss)]" /> : null}
            </button>
          ))}
        </nav>

        <div className="relative ml-auto hidden items-center gap-4 md:flex">
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-full text-[var(--ink)] outline-none hover:bg-[var(--chip)]"
            aria-label="Notifications"
            onClick={() => {
              setNoticeOpen((open) => !open);
              setSettingsOpen(false);
            }}
          >
            <Bell className="size-5" aria-hidden="true" />
            {notifications.length ? (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[var(--gold)] ring-2 ring-[var(--paper-strong)]" />
            ) : null}
          </button>
          <button
            type="button"
            className={cx(
              "grid size-10 place-items-center overflow-hidden rounded-full bg-[var(--chip)] outline-none transition hover:ring-[var(--moss)]",
              activeItem === "profile"
                ? "ring-[3px] ring-[var(--moss)] ring-offset-2 ring-offset-[var(--nav-bg)]"
                : "ring-1 ring-[var(--line)]",
            )}
            aria-current={activeItem === "profile" ? "page" : undefined}
            aria-label={currentUser ? `Open ${currentUser.name}'s profile` : "Open profile"}
            onClick={() => currentUser && onOpenProfile?.(currentUser.id)}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <UserRound className="size-4 text-[var(--muted)]" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-[var(--ink)] outline-none hover:bg-[var(--chip)]"
            aria-label="Open settings"
            aria-expanded={settingsOpen}
            onClick={() => {
              setSettingsOpen((open) => !open);
              setNoticeOpen(false);
            }}
          >
            <Settings className="size-5" aria-hidden="true" />
          </button>
          {noticeOpen ? (
            <div
              className="absolute right-14 top-14 z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-4"
              style={{ boxShadow: "var(--elevated-shadow)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Updates for you</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Posts from people you follow and tags in your photo profile.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--chip)] px-2 py-1 text-xs text-[var(--muted)]">
                  {notifications.length}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {notifications.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-md border border-[var(--line)] bg-[var(--paper)] p-3">
                      <span className="grid size-9 place-items-center rounded-full bg-[var(--chip)] text-[var(--moss)]">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-5 text-[var(--ink)]">{item.title}</span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--muted)]">{item.body}</span>
                        <span className="mt-2 block text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{item.meta}</span>
                      </span>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {settingsOpen ? (
            <div className="absolute right-0 top-14">
              <SettingsPanel />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="ml-auto grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] md:hidden"
          aria-label={`Open saved places${savedCount ? `, ${savedCount} saved` : ""}`}
          onClick={onOpenUpload}
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] md:hidden"
          aria-label="Open settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <Settings className="size-5" aria-hidden="true" />
        </button>
        {settingsOpen ? (
          <div className="absolute right-5 top-16 md:hidden">
            <SettingsPanel />
          </div>
        ) : null}
      </div>
    </header>
  );
}
