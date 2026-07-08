"use client";

import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { ProfileSummary } from "@/components/profile-summary";
import { places, users } from "@/lib/data";
import { useDemoState } from "@/lib/demo-state";

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const { photos, currentUserId, savedPlaceIds, followedUserIds, toggleFollowUser } = useDemoState();
  const user = users.find((item) => item.id === params.userId);
  if (!user) notFound();
  const savedPlaces = user.id === currentUserId ? places.filter((place) => savedPlaceIds.includes(place.id)) : [];

  return (
    <AppShell>
      <div className="space-y-5">
        <BackButton label="Back" fallbackHref="/" />
        <ProfileSummary
          user={user}
          photos={photos.filter((photo) => photo.userId === user.id)}
          savedPlaces={savedPlaces}
          isCurrentUser={user.id === currentUserId}
          isFollowed={followedUserIds.includes(user.id)}
          onToggleFollow={toggleFollowUser}
          onOpenPlace={(placeId) => router.push(`/places/${placeId}`)}
        />
      </div>
    </AppShell>
  );
}
