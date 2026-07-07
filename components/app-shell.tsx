"use client";

import { useState, type ReactNode } from "react";
import { Bookmark, Grid2X2, Map, PlusCircle, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { places } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";
import type { User } from "../lib/types";
import { TopNav } from "./top-nav";
import { UploadModal } from "./upload-modal";

type ShellNavItem = {
  id: string;
  label: string;
  href?: string;
};

type AppShellProps = {
  children: ReactNode;
  rightRail?: ReactNode;
  currentUser?: User;
  areaLabel?: string;
  activeItem?: string;
  savedCount?: number;
  navItems?: ShellNavItem[];
  onNavigate?: (item: ShellNavItem) => void;
  onOpenUpload?: () => void;
  onOpenSaved?: () => void;
  onOpenProfile?: (userId: string) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({
  children,
  rightRail,
  currentUser,
  areaLabel,
  activeItem = "discover",
  savedCount,
  navItems,
  onNavigate,
  onOpenUpload,
  onOpenSaved,
  onOpenProfile,
}: AppShellProps) {
  const router = useRouter();
  const demo = useDemoState();
  const [uploadOpen, setUploadOpen] = useState(false);
  const shellCurrentUser = currentUser ?? demo.currentUser;
  const shellSavedCount = savedCount ?? demo.savedPlaceIds.length;
  const handleNavigate = onNavigate ?? ((item: ShellNavItem) => router.push(item.href ?? "/"));
  const handleOpenUpload = onOpenUpload ?? (() => setUploadOpen(true));
  const handleOpenSaved = onOpenSaved ?? (() => router.push("/saved"));
  const handleOpenProfile = onOpenProfile ?? ((userId: string) => router.push(`/profile/${userId}`));
  const mobileItems = [
    { id: "discover", label: "Discover", icon: Grid2X2, href: "/" },
    { id: "map", label: "Map", icon: Map, href: "/map" },
    { id: "add", label: "Add", icon: PlusCircle },
    { id: "saved", label: "Saved", icon: Bookmark, href: "/saved" },
    { id: "profile", label: "Profile", icon: UserRound },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <TopNav
        areaLabel={areaLabel}
        activeItem={activeItem}
        navItems={navItems}
        currentUser={shellCurrentUser}
        savedCount={shellSavedCount}
        onNavigate={handleNavigate}
        onOpenUpload={handleOpenUpload}
        onOpenSaved={handleOpenSaved}
        onOpenProfile={handleOpenProfile}
      />

      <main
        className={cx(
          "mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-4 py-5 pb-24 sm:px-6 lg:pb-8",
          Boolean(rightRail) && "lg:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
        <section aria-label="Discover content" className="min-w-0">
          {children}
        </section>
        {rightRail ? (
          <aside className="hidden min-w-0 lg:block" aria-label="Discovery side panel">
            <div className="sticky top-20 space-y-4">{rightRail}</div>
          </aside>
        ) : null}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_24px_rgba(24,24,27,0.06)] backdrop-blur md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cx(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                  isActive ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100",
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (item.id === "add") handleOpenUpload();
                  else if (item.id === "saved") handleOpenSaved();
                  else if (item.id === "profile" && shellCurrentUser) handleOpenProfile(shellCurrentUser.id);
                  else handleNavigate({ id: item.id, label: item.label, href: item.href });
                }}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <UploadModal
        open={uploadOpen}
        places={places}
        onClose={() => setUploadOpen(false)}
        onSubmit={(input) => {
          const place = places.find((item) => item.id === input.placeId);
          demo.addPhoto({
            placeId: input.placeId,
            imageUrl: input.previewUrl,
            caption: input.caption,
            metadataText: input.metadataText,
            shotAtTimeOfDay: input.usedCurrentLocation ? "Current location" : "Demo upload",
            tags: input.tags,
            locationLabel: place?.name ?? input.approximateLocationLabel ?? "Selected Oculi place"
          });
        }}
      />
    </div>
  );
}
