"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { areas, currentUserId, photos as seedPhotos, places, users } from "./data";
import { sortTopPlaces } from "./scoring";
import {
  createInitialDemoState,
  loadDemoState,
  resetDemoState as clearDemoState,
  saveDemoState
} from "./storage";
import type { AddPhotoInput, Area, Comment, DemoState, Photo, Place, Reply, User } from "./types";

type DemoContextValue = {
  state: DemoState;
  users: User[];
  areas: Area[];
  places: Place[];
  topPlaces: Place[];
  photos: Photo[];
  comments: Comment[];
  currentUser: User;
  currentUserId: string;
  savedPlaceIds: string[];
  followedUserIds: string[];
  likedPhotoIds: string[];
  likedCommentIds: string[];
  likedReplyIds: string[];
  toggleSavedPlace: (placeId: string) => void;
  toggleFollowUser: (userId: string) => void;
  togglePhotoLike: (photoId: string) => void;
  addPhoto: (input: AddPhotoInput) => Photo;
  addComment: (photoId: string, body: string) => Comment | undefined;
  toggleCommentLike: (commentId: string) => void;
  addReply: (commentId: string, body: string) => Reply | undefined;
  toggleReplyLike: (replyId: string) => void;
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

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createInitialDemoState());
  const [hasLoadedStoredState, setHasLoadedStoredState] = useState(false);

  useEffect(() => {
    setState(loadDemoState());
    setHasLoadedStoredState(true);
  }, []);

  useEffect(() => {
    if (hasLoadedStoredState) saveDemoState(state);
  }, [hasLoadedStoredState, state]);

  const value = useMemo<DemoContextValue>(() => {
    const update = (fn: (state: DemoState) => DemoState) => setState((prev) => fn(prev));
    const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];

    return {
      state,
      users,
      areas,
      places,
      topPlaces: sortTopPlaces(places),
      photos: [...state.uploadedPhotos, ...seedPhotos],
      comments: state.comments,
      currentUser,
      currentUserId,
      savedPlaceIds: state.savedPlaceIds,
      followedUserIds: state.followedUserIds,
      likedPhotoIds: state.likedPhotoIds,
      likedCommentIds: state.likedCommentIds,
      likedReplyIds: state.likedReplyIds,
      toggleSavedPlace: (placeId) =>
        update((prev) => ({ ...prev, savedPlaceIds: toggleId(prev.savedPlaceIds, placeId) })),
      toggleFollowUser: (userId) => {
        if (userId === currentUserId) return;
        update((prev) => ({ ...prev, followedUserIds: toggleId(prev.followedUserIds, userId) }));
      },
      togglePhotoLike: (photoId) =>
        update((prev) => ({ ...prev, likedPhotoIds: toggleId(prev.likedPhotoIds, photoId) })),
      addPhoto: (input) => {
        const place = places.find((item) => item.id === input.placeId);
        const photo: Photo = {
          ...input,
          id: makeId("upload"),
          userId: currentUserId,
          likeCount: 0,
          createdAt: new Date().toISOString(),
          locationLabel: input.locationLabel || place?.fuzzyLocationLabel || "Selected Oculi place",
          tags: input.tags ?? []
        };
        update((prev) => ({ ...prev, uploadedPhotos: [photo, ...prev.uploadedPhotos] }));
        return photo;
      },
      addComment: (photoId, body) => {
        const trimmed = body.trim();
        if (!trimmed) return undefined;

        const comment: Comment = {
          id: makeId("comment"),
          photoId,
          userId: currentUserId,
          body: trimmed,
          createdAt: new Date().toISOString(),
          likeCount: 0,
          replies: []
        };

        update((prev) => ({ ...prev, comments: [...prev.comments, comment] }));
        return comment;
      },
      toggleCommentLike: (commentId) =>
        update((prev) => ({ ...prev, likedCommentIds: toggleId(prev.likedCommentIds, commentId) })),
      addReply: (commentId, body) => {
        const trimmed = body.trim();
        if (!trimmed) return undefined;

        const reply: Reply = {
          id: makeId("reply"),
          userId: currentUserId,
          body: trimmed,
          createdAt: new Date().toISOString(),
          likeCount: 0
        };

        update((prev) => ({
          ...prev,
          comments: prev.comments.map((comment) =>
            comment.id === commentId
              ? { ...comment, replies: [...comment.replies, reply] }
              : comment
          )
        }));
        return reply;
      },
      toggleReplyLike: (replyId) =>
        update((prev) => ({ ...prev, likedReplyIds: toggleId(prev.likedReplyIds, replyId) })),
      resetDemoState: () => {
        setState(clearDemoState());
      }
    };
  }, [state]);

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState() {
  const context = useContext(DemoStateContext);
  if (!context) throw new Error("useDemoState must be used inside DemoStateProvider");
  return context;
}
