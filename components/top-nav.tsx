"use client";

import { useState } from "react";
import { Bell, Menu, Plus, SlidersHorizontal, UserRound } from "lucide-react";
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
  const allNavItems = [...navItems, { id: "add", label: "Add Photo" }];
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={cx("sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(255,253,248,0.88)] backdrop-blur-xl", className)}>
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
            className="grid size-10 place-items-center rounded-full text-[var(--ink)] outline-none hover:bg-[var(--chip)]"
            aria-label="Notifications"
            onClick={() => {
              setNoticeOpen((open) => !open);
              setMenuOpen(false);
            }}
          >
            <Bell className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="grid size-10 place-items-center overflow-hidden rounded-full bg-[var(--chip)] outline-none ring-1 ring-[var(--line)]"
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
            aria-label="Menu"
            onClick={() => {
              setMenuOpen((open) => !open);
              setNoticeOpen(false);
            }}
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
          {noticeOpen ? (
            <div className="absolute right-14 top-14 z-50 w-80 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-4 shadow-[0_18px_45px_rgba(39,34,27,0.14)]">
              <p className="text-sm font-semibold text-[var(--ink)]">Today on Oculi</p>
              <div className="mt-3 space-y-3 text-sm text-[var(--muted)]">
                <p>Maya saved Baker Beach for sunset portraits.</p>
                <p>Eli added a fog note near the Presidio overlook.</p>
                <p>{savedCount} places are ready in your shoot list.</p>
              </div>
            </div>
          ) : null}
          {menuOpen ? (
            <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_18px_45px_rgba(39,34,27,0.14)]">
              <button type="button" className="block w-full px-4 py-3 text-left text-sm hover:bg-[var(--chip)]" onClick={onOpenUpload}>Add photo</button>
              <button type="button" className="block w-full px-4 py-3 text-left text-sm hover:bg-[var(--chip)]" onClick={onOpenSaved}>Saved places</button>
              <button type="button" className="block w-full px-4 py-3 text-left text-sm hover:bg-[var(--chip)]" onClick={() => currentUser && onOpenProfile?.(currentUser.id)}>Profile</button>
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
          aria-label="Filters"
          onClick={() => onNavigate?.({ id: "map", label: "Map", href: "/map" })}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
