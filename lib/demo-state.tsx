"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ensureAuthSession,
  sessionToAuthUser,
  signInWithGoogleUpgrade,
  signOutToFreshAnonymousSession,
  type AuthUser,
  type GoogleUpgradeResult,
} from "./auth-session";
import { buildCurrentUser, buildVisibleUsers } from "./current-user";
import { currentUserId } from "./data";
import { createRetryScheduler, type PersistenceStatus, type RetryScheduler } from "./persistence-status";
import { applyBootstrapState, type RelationKey } from "./bootstrap-merge";
import { relationsToMigrateUp } from "./relation-defaults";
import {
  deleteUploadedPhotoFile,
  isRemoteStateEnabled,
  loadLegacyRelationsFromStateRow,
  loadRemoteDemoCatalog,
  loadRemoteDemoState,
  loadRemoteUserRelations,
  markPhotoViewedRemote,
  resetRemoteDemoState,
  saveRemoteCatalogPhoto,
  saveRemoteDemoState,
  seedCatalog,
  setFollowedUserRemote,
  setLikedPhotoRemote,
  setSavedPlaceRemote,
  uploadPhotoFile,
  type UserRelations,
} from "./remote-state";
import { sortTopPlaces } from "./scoring";
import { mergeDemoStates, selectSavedPlaceIdsToMigrate, unionPreserveOrder } from "./state-merge";
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
  itineraryPlaceIds: string[];
  followedUserIds: string[];
  likedPhotoIds: string[];
  isRemoteBacked: boolean;
  hasLoadedRemoteState: boolean;
  persistenceStatus: PersistenceStatus | null;
  retryPersistence: () => void;
  /** The real Supabase auth identity backing state persistence (owner id of
   * the `oculi_demo_states` row), distinct from the fictional demo profile
   * (`currentUserId`/`currentUser` above). Null when Supabase isn't
   * configured or auth bootstrap hasn't finished/failed. */
  authUser: AuthUser | null;
  signInWithGoogle: () => Promise<GoogleUpgradeResult>;
  signOutOfAccount: () => Promise<void>;
  recordPhotoView: (photo: Photo, discoveryActiveIndex?: number) => void;
  recordPlaceView: (placeId: string, discoveryActiveIndex?: number) => void;
  toggleSavedPlace: (placeId: string) => void;
  addToItinerary: (placeId: string) => void;
  removeFromItinerary: (placeId: string) => void;
  reorderItinerary: (placeId: string, nextIndex: number) => void;
  toggleFollowUser: (userId: string) => void;
  togglePhotoLike: (photoId: string) => void;
  updateProfile: (profile: EditableProfile) => void;
  addPhoto: (input: AddPhotoInput) => Promise<Photo>;
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

// --- Relation reconciliation helpers (docs/demo-to-product-audit.md item 6) ---
//
// Saves/follows/likes/photo-views moved out of the whole-state blob into
// their own per-entity tables (20260710000600_normalize_user_relations.sql)
// so a toggle is a single row insert/delete instead of a whole-state upsert,
// and two tabs/devices touching different relations can't clobber each
// other. `DemoState` still carries these four arrays (nothing downstream
// had to change how it reads them), but on bootstrap they're reconciled from
// every place they might still live -- local storage, either identity's
// legacy state-blob copy from before this migration, and either identity's
// new per-entity table rows -- unioned together so nothing already
// saved/followed/liked/viewed is lost.

function relationsFromState(state: DemoState): UserRelations {
  return {
    savedPlaceIds: state.savedPlaceIds,
    followedUserIds: state.followedUserIds,
    likedPhotoIds: state.likedPhotoIds,
    viewedPhotoIds: state.viewedPhotoIds,
  };
}

function unionAllRelations(sources: UserRelations[]): UserRelations {
  return sources.reduce<UserRelations>(
    (acc, next) => ({
      savedPlaceIds: unionPreserveOrder(acc.savedPlaceIds, next.savedPlaceIds),
      followedUserIds: unionPreserveOrder(acc.followedUserIds, next.followedUserIds),
      likedPhotoIds: unionPreserveOrder(acc.likedPhotoIds, next.likedPhotoIds),
      viewedPhotoIds: unionPreserveOrder(acc.viewedPhotoIds, next.viewedPhotoIds),
    }),
    { savedPlaceIds: [], followedUserIds: [], likedPhotoIds: [], viewedPhotoIds: [] },
  );
}

/** Migrate-up: makes sure every reconciled relation id is durably present in
 * the owner's per-entity tables (idempotent upserts/no-ops for ids already
 * there), so future loads read the same data straight from the tables
 * without needing this reconciliation pass again. Fire-and-forget -- each
 * underlying call already swallows its own errors with a console.warn.
 *
 * `otherDurableSavedPlaceIds` gates the seed-default saved places (see
 * `lib/state-merge.ts` `selectSavedPlaceIdsToMigrate`) so a fresh visitor's
 * fabricated "starts with 4 saves" demo flavor never gets written into the
 * durable `saved_places` table -- only ids proven by a real durable source
 * (existing table rows, either identity's) migrate up. */
function reconcileOwnedRelations(
  ownerId: string,
  merged: UserRelations,
  existing: UserRelations,
  otherDurableSavedPlaceIds: string[] = [],
) {
  selectSavedPlaceIdsToMigrate(merged.savedPlaceIds, existing.savedPlaceIds, otherDurableSavedPlaceIds).forEach(
    (placeId) => setSavedPlaceRemote(ownerId, placeId, true),
  );
  merged.followedUserIds
    .filter((id) => !existing.followedUserIds.includes(id))
    .forEach((userId) => setFollowedUserRemote(ownerId, userId, true));
  merged.likedPhotoIds
    .filter((id) => !existing.likedPhotoIds.includes(id))
    .forEach((photoId) => setLikedPhotoRemote(ownerId, photoId, true));
  merged.viewedPhotoIds
    .filter((id) => !existing.viewedPhotoIds.includes(id))
    .forEach((photoId) => markPhotoViewedRemote(ownerId, photoId));
}

type PersistPayload = { state: DemoState; ownerId: string };

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createInitialDemoState());
  const [catalog, setCatalog] = useState(seedCatalog);
  const [hasLoadedRemoteState, setHasLoadedRemoteState] = useState(false);
  const [stateOwnerId, setStateOwnerId] = useState(currentUserId);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // A single retry/backoff scheduler instance for the whole-state Supabase
  // write, created once and reused across renders. It surfaces status
  // ("saving"/"saved"/"retrying"/"failed") instead of the old silent
  // console.warn-and-drop behavior (docs/demo-to-product-audit.md item 5).
  const schedulerRef = useRef<RetryScheduler<PersistPayload> | null>(null);
  if (schedulerRef.current === null) {
    schedulerRef.current = createRetryScheduler<PersistPayload>({
      write: ({ state: payloadState, ownerId }) => saveRemoteDemoState(payloadState, ownerId),
      onStatusChange: setPersistenceStatus,
    });
  }

  useEffect(() => {
    const scheduler = schedulerRef.current;
    return () => scheduler?.dispose();
  }, []);

  // Tracks the exact state object last handed to a save (immediate or
  // debounced) so the two paths can't both fire for the same change --
  // see the `persistStateNow` / debounce-effect note below
  // (docs/demo-to-product-audit.md item 6's folded-in double-write bug).
  const lastPersistedStateRef = useRef<DemoState | null>(null);

  // Relations the user has explicitly acted on since mount. A late-resolving
  // bootstrap hydration must not clobber these with the (stale) relation set
  // it fetched before the action happened — see lib/bootstrap-merge.ts.
  const userTouchedRelationsRef = useRef<Set<RelationKey>>(new Set());

  useEffect(() => {
    let cancelled = false;

    if (!isRemoteStateEnabled()) {
      // Graceful degradation: no Supabase config at all, keep the original
      // client-generated visitor id + localStorage-only flow untouched.
      setStateOwnerId(getDemoVisitorId());
      setState(loadLocalDemoState());
      setCatalog(seedCatalog);
      setHasLoadedRemoteState(true);
      return;
    }

    (async () => {
      // Anonymous-first bootstrap: every visitor gets a real Supabase auth
      // session (anonymous if they haven't signed in), no login wall.
      const session = await ensureAuthSession();
      if (cancelled) return;

      if (!session) {
        // Auth bootstrap itself failed (e.g. anonymous sign-in rejected) -
        // fall back to the pre-auth visitor-id-keyed remote flow so
        // persistence still degrades gracefully instead of breaking. Still
        // reconciles relations from the per-entity tables (unioned with
        // whatever the legacy state blob has) for the same reason the
        // authenticated branch below does.
        const visitorId = getDemoVisitorId();
        setStateOwnerId(visitorId);
        setAuthUser(null);
        Promise.all([
          loadRemoteDemoState(visitorId).catch((error) => {
            console.warn("Unable to hydrate Oculi state from Supabase.", error);
            return createInitialDemoState();
          }),
          loadRemoteUserRelations(visitorId),
        ]).then(([remoteState, tableRelations]) => {
          if (cancelled) return;
          const mergedRelations = unionAllRelations([relationsFromState(remoteState), tableRelations]);
          setState((prev) => applyBootstrapState(prev, remoteState, mergedRelations, userTouchedRelationsRef.current));
          setHasLoadedRemoteState(true);
        });
      } else {
        const ownerId = session.user.id;
        setStateOwnerId(ownerId);
        setAuthUser(sessionToAuthUser(session));

        // Migrate any prior identity's state into the new auth-keyed row:
        // the browser's localStorage blob, and/or a remote row still keyed
        // by the legacy client-generated `visitor-<uuid>` id.
        const legacyVisitorId = getDemoVisitorId();
        const localState = loadLocalDemoState();
        const hasLegacyVisitor = Boolean(legacyVisitorId && legacyVisitorId !== ownerId);

        const [
          ownedRemoteState,
          legacyRemoteState,
          ownedTableRelations,
          legacyTableRelations,
          ownedLegacyBlobRelations,
          legacyBlobRelations,
        ] = await Promise.all([
          loadRemoteDemoState(ownerId).catch((error) => {
            console.warn("Unable to hydrate Oculi state from Supabase.", error);
            return createInitialDemoState();
          }),
          hasLegacyVisitor
            ? loadRemoteDemoState(legacyVisitorId).catch(() => createInitialDemoState())
            : Promise.resolve(createInitialDemoState()),
          loadRemoteUserRelations(ownerId),
          hasLegacyVisitor ? loadRemoteUserRelations(legacyVisitorId) : Promise.resolve(relationsFromState(createInitialDemoState())),
          loadLegacyRelationsFromStateRow(ownerId),
          hasLegacyVisitor
            ? loadLegacyRelationsFromStateRow(legacyVisitorId)
            : Promise.resolve(relationsFromState(createInitialDemoState())),
        ]);

        if (cancelled) return;

        const priorState = mergeDemoStates(localState, legacyRemoteState);
        const mergedState = mergeDemoStates(priorState, ownedRemoteState);

        const mergedRelations = unionAllRelations([
          relationsFromState(localState),
          relationsFromState(legacyRemoteState),
          relationsFromState(ownedRemoteState),
          legacyBlobRelations,
          ownedLegacyBlobRelations,
          legacyTableRelations,
          ownedTableRelations,
        ]);

        let finalState: DemoState = {
          ...mergedState,
          savedPlaceIds: mergedRelations.savedPlaceIds,
          followedUserIds: mergedRelations.followedUserIds,
          likedPhotoIds: mergedRelations.likedPhotoIds,
          viewedPhotoIds: mergedRelations.viewedPhotoIds,
        };

        setState((prev) => {
          finalState = applyBootstrapState(prev, mergedState, mergedRelations, userTouchedRelationsRef.current);
          return finalState;
        });
        setHasLoadedRemoteState(true);

        // Make the reconciled relations durable in the owner's per-entity
        // tables going forward (idempotent, fire-and-forget) -- but never
        // migrate up saved/followed relations that are still exactly the
        // untouched demo defaults (docs/demo-to-product-implementation.md
        // item 1 / LOOP.md Task 6a). Local state keeps showing the demo
        // defaults either way (`finalState` above is untouched); this only
        // gates what becomes a durable, publicly-counted row.
        reconcileOwnedRelations(ownerId, relationsToMigrateUp(mergedRelations), ownedTableRelations);

        if (JSON.stringify(finalState) !== JSON.stringify(ownedRemoteState)) {
          saveRemoteDemoState(finalState, ownerId).catch((error) => {
            console.warn("Unable to persist merged Oculi state to Supabase.", error);
          });
        }
      }

      loadRemoteDemoCatalog()
        .catch((error) => {
          console.warn("Unable to hydrate Oculi catalog from Supabase.", error);
          return seedCatalog;
        })
        .then((remoteCatalog) => {
          if (cancelled) return;
          setCatalog(remoteCatalog);
        });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced whole-state save (for the remaining scalar/session fields --
  // relations are now persisted via their own granular calls, see the
  // toggle/record actions below). Skips re-saving a `state` object that
  // `persistStateNow` already just saved synchronously, so the two paths
  // never both fire for the same change (docs/demo-to-product-audit.md item
  // 6's folded-in double-write bug: previously `persistStateNow` plus this
  // effect both fired for the same state transition, writing the same
  // payload to Supabase twice).
  useEffect(() => {
    if (!hasLoadedRemoteState) return;
    if (lastPersistedStateRef.current === state) return;

    const timeout = window.setTimeout(() => {
      lastPersistedStateRef.current = state;
      saveLocalDemoState(state);
      if (isRemoteStateEnabled()) schedulerRef.current?.run({ state, ownerId: stateOwnerId });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedRemoteState, state, stateOwnerId]);

  const value = useMemo<DemoContextValue>(() => {
    const persistStateNow = (next: DemoState) => {
      lastPersistedStateRef.current = next;
      saveLocalDemoState(next);
      if (isRemoteStateEnabled()) schedulerRef.current?.run({ state: next, ownerId: stateOwnerId });
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

    // `viewerId` is the real identity for this visitor -- the authenticated
    // Supabase user (`stateOwnerId`, which resolves to `session.user.id` for
    // both anonymous and Google-linked sessions, see the bootstrap effect
    // above), not the fictional `currentUserId` seed persona from
    // lib/data.ts (docs/demo-to-product-implementation.md item 3: retiring
    // `user-guest` as "you"). `seedCurrentUser` is only consulted for its
    // *display* fields (name "John Doe", avatar, bio, etc.) -- the anonymous
    // visitor's default, editable display profile -- never for identity.
    // Before the auth bootstrap effect resolves, `stateOwnerId` is still its
    // initial placeholder value (the fictional `currentUserId`), so this
    // still renders sensibly during that brief loading window; no remote
    // write ever uses `viewerId` directly (see `resolveOwnerId` below, which
    // waits on `hasLoadedRemoteState`/`ensureAuthSession` instead).
    const viewerId = stateOwnerId;
    const seedCurrentUser = users.find((user) => user.id === currentUserId) ?? users[0];
    const currentUser = buildCurrentUser(seedCurrentUser, viewerId, state.profile);
    const visibleUsers = buildVisibleUsers(users, viewerId, currentUser);

    // Resolves the real owner id for a remote write, waiting on the
    // in-flight auth bootstrap rather than ever falling back to the
    // fictional `currentUserId` seed persona. `ensureAuthSession` is
    // single-flight (lib/auth-session.ts), so calling it again here after
    // bootstrap has already run is a cheap no-op that returns the same
    // session.
    const resolveOwnerId = async (): Promise<string> => {
      if (hasLoadedRemoteState) return stateOwnerId;
      const session = await ensureAuthSession();
      return session?.user.id ?? stateOwnerId;
    };

    return {
      state,
      users: visibleUsers,
      areas,
      places,
      topPlaces: sortTopPlaces(places),
      photos: mergePhotos(state.uploadedPhotos, seedPhotos),
      currentUser,
      currentUserId: viewerId,
      savedPlaceIds: state.savedPlaceIds,
      itineraryPlaceIds: state.itineraryPlaceIds,
      followedUserIds: state.followedUserIds,
      likedPhotoIds: state.likedPhotoIds,
      isRemoteBacked: isRemoteStateEnabled(),
      hasLoadedRemoteState,
      persistenceStatus,
      retryPersistence: () => schedulerRef.current?.retryNow(),
      authUser,
      signInWithGoogle: () => {
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";
        return signInWithGoogleUpgrade(redirectTo);
      },
      signOutOfAccount: async () => {
        const session = await signOutToFreshAnonymousSession();
        if (!session) {
          setAuthUser(null);
          return;
        }
        const ownerId = session.user.id;
        setStateOwnerId(ownerId);
        setAuthUser(sessionToAuthUser(session));
        const freshState = await loadRemoteDemoState(ownerId).catch(() => createInitialDemoState());
        setState(freshState);
      },
      recordPhotoView: (photo, discoveryActiveIndex) => {
        userTouchedRelationsRef.current.add("viewedPhotoIds");
        update((prev) => {
          const next = recordPlaceViewInState(prev, photo.placeId, discoveryActiveIndex);
          return {
            ...next,
            viewedPhotoIds: next.viewedPhotoIds.includes(photo.id)
              ? next.viewedPhotoIds
              : [...next.viewedPhotoIds, photo.id],
          };
        });
        // Upserts one (user, photo) row -- `viewed_at` bumps on repeat views
        // instead of an ever-growing array (docs/demo-to-product-audit.md item 6).
        if (isRemoteStateEnabled()) resolveOwnerId().then((ownerId) => markPhotoViewedRemote(ownerId, photo.id));
      },
      recordPlaceView: (placeId, discoveryActiveIndex) =>
        update((prev) => recordPlaceViewInState(prev, placeId, discoveryActiveIndex)),
      toggleSavedPlace: (placeId) => {
        userTouchedRelationsRef.current.add("savedPlaceIds");
        const nextSaved = !state.savedPlaceIds.includes(placeId);
        update((prev) => ({ ...prev, savedPlaceIds: toggleId(prev.savedPlaceIds, placeId) }));
        // Single row insert/delete, not a whole-state upsert.
        if (isRemoteStateEnabled()) resolveOwnerId().then((ownerId) => setSavedPlaceRemote(ownerId, placeId, nextSaved));
      },
      // The itinerary is an ordered, session-style list kept in the state
      // blob (like viewedPlaceIds/placeViews) -- not one of the four relation
      // tables -- so these actions persist through the debounced whole-state
      // save rather than a granular remote helper.
      addToItinerary: (placeId) =>
        update((prev) =>
          prev.itineraryPlaceIds.includes(placeId)
            ? prev
            : { ...prev, itineraryPlaceIds: [...prev.itineraryPlaceIds, placeId] },
        ),
      removeFromItinerary: (placeId) =>
        update((prev) => ({
          ...prev,
          itineraryPlaceIds: prev.itineraryPlaceIds.filter((id) => id !== placeId),
        })),
      reorderItinerary: (placeId, nextIndex) =>
        update((prev) => {
          const index = prev.itineraryPlaceIds.indexOf(placeId);
          if (index < 0 || nextIndex < 0 || nextIndex >= prev.itineraryPlaceIds.length || index === nextIndex) {
            return prev;
          }
          const itineraryPlaceIds = [...prev.itineraryPlaceIds];
          const [moved] = itineraryPlaceIds.splice(index, 1);
          itineraryPlaceIds.splice(nextIndex, 0, moved);
          return { ...prev, itineraryPlaceIds };
        }),
      toggleFollowUser: (userId) => {
        if (userId === viewerId) return;
        userTouchedRelationsRef.current.add("followedUserIds");
        const nextFollowed = !state.followedUserIds.includes(userId);
        update((prev) => ({ ...prev, followedUserIds: toggleId(prev.followedUserIds, userId) }));
        if (isRemoteStateEnabled()) resolveOwnerId().then((ownerId) => setFollowedUserRemote(ownerId, userId, nextFollowed));
      },
      togglePhotoLike: (photoId) => {
        userTouchedRelationsRef.current.add("likedPhotoIds");
        const nextLiked = !state.likedPhotoIds.includes(photoId);
        update((prev) => ({ ...prev, likedPhotoIds: toggleId(prev.likedPhotoIds, photoId) }));
        if (isRemoteStateEnabled()) resolveOwnerId().then((ownerId) => setLikedPhotoRemote(ownerId, photoId, nextLiked));
      },
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
      addPhoto: async (input) => {
        const place = places.find((item) => item.id === input.placeId);
        const id = makeId("upload");
        const { file, ...photoInput } = input;
        const uploadedFile = file ? await uploadPhotoFile(file, id) : null;
        if (!uploadedFile) {
          throw new Error("The photo could not be uploaded. Check your connection and try again.");
        }
        const photo: Photo = {
          ...photoInput,
          id,
          // Real uploads are attributed to the real viewer, never the
          // fictional `user-guest` seed persona (docs/demo-to-product-implementation.md
          // item 3). `public.photos`'s own `owner_id` column (set from
          // `auth.uid()` by the DB default, see saveRemoteCatalogPhoto) is
          // the actual source of truth once this photo is hydrated back from
          // Supabase -- this local field just keeps the freshly-added photo
          // displaying correctly before that round trip completes.
          userId: viewerId,
          imageUrl: uploadedFile.publicUrl,
          likeCount: 0,
          createdAt: new Date().toISOString(),
          locationLabel: input.locationLabel || place?.fuzzyLocationLabel || "Selected Oculi place",
          tags: input.tags ?? []
        };
        try {
          await saveRemoteCatalogPhoto(photo);
        } catch (error) {
          await deleteUploadedPhotoFile(uploadedFile.path);
          throw error;
        }
        const next = { ...state, uploadedPhotos: [photo, ...state.uploadedPhotos] };
        setState(next);
        persistStateNow(next);
        return photo;
      },
      resetDemoState: () => {
        setState(createInitialDemoState());
        resetLocalDemoState();
        resetRemoteDemoState(stateOwnerId);
      }
    };
  }, [authUser, catalog, hasLoadedRemoteState, persistenceStatus, state, stateOwnerId]);

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState() {
  const context = useContext(DemoStateContext);
  if (!context) throw new Error("useDemoState must be used inside DemoStateProvider");
  return context;
}
