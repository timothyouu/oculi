"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { currentUserId } from "./data";
import {
  isRemoteStateEnabled,
  loadRemoteDemoCatalog,
  loadRemoteDemoState,
  resetRemoteDemoState,
  saveRemoteCatalogPhoto,
  saveRemoteDemoState,
  seedCatalog,
  uploadPhotoFile,
} from "./remote-state";
import { sortTopPlaces } from "./scoring";
import {
  createInitialDemoState,
  getDemoVisitorId,
  loadLocalDemoState,
  resetLocalDemoState,
  saveLocalDemoState,
} from "./storage";
import type { AddPhotoInput, Area, DemoState, EditableProfile, Photo, Place, User } from "./types";

type DemoContextValue = {
  state: DemoState;
  users: User[];
  areas: Area[];
  places: Place[];
  topPlaces: Place[];
  photos: Photo[];
  currentUser: User;
  currentUserId: string;
  savedPlaceIds: string[];
  followedUserIds: string[];
  likedPhotoIds: string[];
  isRemoteBacked: boolean;
  hasLoadedRemoteState: boolean;
  recordPhotoView: (photo: Photo, discoveryActiveIndex?: number) => void;
  recordPlaceView: (placeId: string, discoveryActiveIndex?: number) => void;
  toggleSavedPlace: (placeId: string) => void;
  toggleFollowUser: (userId: string) => void;
  togglePhotoLike: (photoId: string) => void;
  updateProfile: (profile: EditableProfile) => void;
  addPhoto: (input: AddPhotoInput) => Photo;
  resetDemoState: () => void;
};

const DemoStateContext = createContext<DemoContextValue | null>(null);

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isDurableImageUrl(url: string) {
  return !url.startsWith("blob:") && !url.startsWith("data:");
}

function mergePhotos(uploadedPhotos: Photo[], catalogPhotos: Photo[]) {
  const photosById = new Map<string, Photo>();
  [...catalogPhotos, ...uploadedPhotos].forEach((photo) => photosById.set(photo.id, photo));
  return Array.from(photosById.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function recordPlaceViewInState(
  state: DemoState,
  placeId: string,
  discoveryActiveIndex?: number,
): DemoState {
  const viewedAt = new Date().toISOString();
  const existingView = state.placeViews.find((view) => view.placeId === placeId);
  const placeViews = existingView
    ? state.placeViews.map((view) =>
        view.placeId === placeId
          ? { ...view, viewedAt, viewCount: view.viewCount + 1 }
          : view,
      )
    : [...state.placeViews, { placeId, viewedAt, viewCount: 1 }];

  return {
    ...state,
    viewedPlaceIds: state.viewedPlaceIds.includes(placeId)
      ? state.viewedPlaceIds
      : [...state.viewedPlaceIds, placeId],
    placeViews,
    lastViewedPlaceId: placeId,
    lastDiscoveryPlaceId: discoveryActiveIndex === undefined ? state.lastDiscoveryPlaceId : placeId,
    discoveryActiveIndex: discoveryActiveIndex === undefined ? state.discoveryActiveIndex : discoveryActiveIndex,
  };
}

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createInitialDemoState());
  const [catalog, setCatalog] = useState(seedCatalog);
  const [hasLoadedRemoteState, setHasLoadedRemoteState] = useState(false);
  const [stateOwnerId, setStateOwnerId] = useState(currentUserId);

  useEffect(() => {
    let cancelled = false;

    if (!isRemoteStateEnabled()) {
      setStateOwnerId(getDemoVisitorId());
      setState(loadLocalDemoState());
      setCatalog(seedCatalog);
      setHasLoadedRemoteState(true);
      return;
    }

    const visitorId = getDemoVisitorId();
    setStateOwnerId(visitorId);

    loadRemoteDemoState(visitorId)
      .catch((error) => {
        console.warn("Unable to hydrate Oculi state from Supabase.", error);
        return createInitialDemoState();
      })
      .then((remoteState) => {
        if (cancelled) return;
        setState(remoteState);
        setHasLoadedRemoteState(true);
      });

    loadRemoteDemoCatalog()
      .catch((error) => {
        console.warn("Unable to hydrate Oculi catalog from Supabase.", error);
        return seedCatalog;
      })
      .then((remoteCatalog) => {
        if (cancelled) return;
        setCatalog(remoteCatalog);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRemoteState) return;

    const timeout = window.setTimeout(() => {
      saveLocalDemoState(state);
      if (isRemoteStateEnabled()) saveRemoteDemoState(state, stateOwnerId);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedRemoteState, state, stateOwnerId]);

  const value = useMemo<DemoContextValue>(() => {
    const persistStateNow = (next: DemoState) => {
      saveLocalDemoState(next);
      if (isRemoteStateEnabled()) saveRemoteDemoState(next, stateOwnerId);
    };
    const update = (fn: (state: DemoState) => DemoState) =>
      setState((prev) => {
        const next = fn(prev);
        return next;
      });
    const users = catalog.users;
    const areas = catalog.areas;
    const places = catalog.places;
    const seedPhotos = catalog.photos;
    const seedCurrentUser = users.find((user) => user.id === currentUserId) ?? users[0];
    const currentUser = { ...seedCurrentUser, ...state.profile };
    const visibleUsers = users.map((user) => (user.id === currentUserId ? currentUser : user));

    return {
      state,
      users: visibleUsers,
      areas,
      places,
      topPlaces: sortTopPlaces(places),
      photos: mergePhotos(state.uploadedPhotos, seedPhotos),
      currentUser,
      currentUserId,
      savedPlaceIds: state.savedPlaceIds,
      followedUserIds: state.followedUserIds,
      likedPhotoIds: state.likedPhotoIds,
      isRemoteBacked: isRemoteStateEnabled(),
      hasLoadedRemoteState,
      recordPhotoView: (photo, discoveryActiveIndex) =>
        update((prev) => {
          const next = recordPlaceViewInState(prev, photo.placeId, discoveryActiveIndex);
          return {
            ...next,
            viewedPhotoIds: next.viewedPhotoIds.includes(photo.id)
              ? next.viewedPhotoIds
              : [...next.viewedPhotoIds, photo.id],
          };
        }),
      recordPlaceView: (placeId, discoveryActiveIndex) =>
        update((prev) => recordPlaceViewInState(prev, placeId, discoveryActiveIndex)),
      toggleSavedPlace: (placeId) => {
        const next = { ...state, savedPlaceIds: toggleId(state.savedPlaceIds, placeId) };
        setState(next);
        persistStateNow(next);
      },
      toggleFollowUser: (userId) => {
        if (userId === currentUserId) return;
        update((prev) => ({ ...prev, followedUserIds: toggleId(prev.followedUserIds, userId) }));
      },
      togglePhotoLike: (photoId) =>
        update((prev) => ({ ...prev, likedPhotoIds: toggleId(prev.likedPhotoIds, photoId) })),
      updateProfile: (profile) =>
        update((prev) => ({
          ...prev,
          profile: {
            ...profile,
            username: profile.username.startsWith("@") ? profile.username : `@${profile.username}`,
            favoriteTags: Array.from(
              new Set(profile.favoriteTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
            ).slice(0, 8),
          },
        })),
      addPhoto: (input) => {
        const place = places.find((item) => item.id === input.placeId);
        const id = makeId("upload");
        const { file, ...photoInput } = input;
        const photo: Photo = {
          ...photoInput,
          id,
          userId: currentUserId,
          likeCount: 0,
          createdAt: new Date().toISOString(),
          locationLabel: input.locationLabel || place?.fuzzyLocationLabel || "Selected Oculi place",
          tags: input.tags ?? []
        };
        const next = { ...state, uploadedPhotos: [photo, ...state.uploadedPhotos] };
        setState(next);
        persistStateNow(next);
        if (isDurableImageUrl(photo.imageUrl)) {
          saveRemoteCatalogPhoto(photo);
        }
        if (file) {
          uploadPhotoFile(file, id).then((remoteUrl) => {
            if (!remoteUrl) return;
            const remotePhoto = { ...photo, imageUrl: remoteUrl };
            setState((prev) => {
              const nextState = {
                ...prev,
                uploadedPhotos: prev.uploadedPhotos.map((item) =>
                  item.id === id ? { ...item, imageUrl: remoteUrl } : item,
                ),
              };
              persistStateNow(nextState);
              return nextState;
            });
            saveRemoteCatalogPhoto(remotePhoto);
          });
        }
        return photo;
      },
      resetDemoState: () => {
        setState(createInitialDemoState());
        resetLocalDemoState();
        resetRemoteDemoState(stateOwnerId);
      }
    };
  }, [catalog, hasLoadedRemoteState, state, stateOwnerId]);

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState() {
  const context = useContext(DemoStateContext);
  if (!context) throw new Error("useDemoState must be used inside DemoStateProvider");
  return context;
}
