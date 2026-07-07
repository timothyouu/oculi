"use client";

import { Bookmark, Camera, ChevronDown, MapPin, UserRound } from "lucide-react";
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

export function TopNav({
  areaLabel = "San Francisco, CA",
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
  return (
    <header className={cx("sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur", className)}>
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="group flex shrink-0 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          aria-label="Go to Oculi discover feed"
          onClick={() => onNavigate?.({ id: "discover", label: "Discover", href: "/" })}
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold tracking-tight text-white">
            Oc
          </span>
          <span className="hidden text-lg font-semibold tracking-tight text-zinc-950 sm:block">Oculi</span>
        </button>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 outline-none transition hover:border-zinc-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 md:flex"
          aria-label={`Current area: ${areaLabel}`}
        >
          <MapPin className="size-4" aria-hidden="true" />
          <span>{areaLabel}</span>
          <ChevronDown className="size-4 text-zinc-500" aria-hidden="true" />
        </button>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(
                "rounded-md px-3 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                activeItem === item.id ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
              )}
              aria-current={activeItem === item.id ? "page" : undefined}
              onClick={() => (item.id === "saved" ? onOpenSaved?.() : onNavigate?.(item))}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 md:ml-2"
          onClick={onOpenUpload}
        >
          <Camera className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Add Photo</span>
        </button>

        <button
          type="button"
          className="relative hidden size-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 sm:inline-flex"
          aria-label={`Open saved places${savedCount ? `, ${savedCount} saved` : ""}`}
          onClick={onOpenSaved}
        >
          <Bookmark className="size-4" aria-hidden="true" />
          {savedCount > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-zinc-950 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {savedCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          aria-label={currentUser ? `Open ${currentUser.name}'s profile` : "Open profile"}
          onClick={() => currentUser && onOpenProfile?.(currentUser.id)}
        >
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-4 text-zinc-600" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
