"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlaceDetailPopup } from "@/components/place-detail-popup";
import { ProfileSummary } from "@/components/profile-summary";
import { useDemoState } from "@/lib/demo-state";

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const { photos, places, users, currentUserId, savedPlaceIds, followedUserIds, toggleFollowUser, recordPlaceView, hasLoadedRemoteState } = useDemoState();
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const popupHistoryRef = useRef(false);
  const user = users.find((item) => item.id === params.userId);
  const openPlace = useCallback((placeId: string) => {
    recordPlaceView(placeId);
    setDetailPlaceId(placeId);

    if (!popupHistoryRef.current) {
      window.history.pushState({ ...window.history.state, oculiPlacePopup: true }, "", window.location.href);
      popupHistoryRef.current = true;
    }
  }, [recordPlaceView]);
  const closePlace = useCallback(() => {
    if (popupHistoryRef.current) {
      window.history.back();
      return;
    }

    setDetailPlaceId(null);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (!popupHistoryRef.current) return;
      popupHistoryRef.current = false;
      setDetailPlaceId(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // The viewer's own profile lives at their *real* identity (the auth uid or
  // pre-auth visitor id -- docs/demo-to-product-implementation.md item 3),
  // which only lands in `users` once the identity bootstrap resolves. Until
  // then an unmatched id isn't yet a 404 -- render the shell and wait; only
  // declare notFound() once identity resolution has finished and the id is
  // definitively unknown.
  if (!user) {
    if (!hasLoadedRemoteState) {
      return (
        <AppShell activeItem="profile">
          <div className="space-y-5" aria-busy="true" />
        </AppShell>
      );
    }
    notFound();
  }

  const savedPlaces = user.id === currentUserId ? places.filter((place) => savedPlaceIds.includes(place.id)) : [];

  return (
    <AppShell activeItem="profile">
      <div className="space-y-5">
        <ProfileSummary
          user={user}
          photos={photos.filter((photo) => photo.userId === user.id)}
          savedPlaces={savedPlaces}
          isCurrentUser={user.id === currentUserId}
          isFollowed={followedUserIds.includes(user.id)}
          onToggleFollow={toggleFollowUser}
          onOpenPlace={openPlace}
        />
        <PlaceDetailPopup placeId={detailPlaceId} onClose={closePlace} onOpenPlace={openPlace} />
      </div>
    </AppShell>
  );
}
