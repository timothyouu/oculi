# Oculi Implementation Plan

Source of truth: `specs.md`.

Status: implementation handoff only. Do not build until Tim explicitly asks to start implementation.

## 1. Build Target

Build a showcase-ready web app called Oculi: a Beli-inspired, original-UI social discovery app for photo locations in San Francisco/California.

The demo must open directly into a photo feed. No onboarding.

Primary demo goals:

- Show amazing photo spots through a photo-first feed.
- Help users discover top places based on most saved, Tim-curated priority, and recent activity.
- Let users save/favorite places.
- Let users follow fictional photographers/friends.
- Let users upload a photo locally with location/place metadata.
- Let users comment, reply, and like photos/comments/replies.
- Show a stylized local map-like place view now, with Mapbox planned later.

## 2. Recommended Stack

Use this unless the repo already has a different app stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- lucide-react for icons
- localStorage for demo persistence
- Browser `FileReader` or `URL.createObjectURL` for local image upload previews

No real auth, database, cloud upload, or production Mapbox wiring for the initial demo.

Why this stack:

- Fast to scaffold and demo.
- Good for a polished responsive UI.
- Easy local state persistence.
- Easy future path to backend APIs and Mapbox.

## 3. App Routes

Implement these routes:

- `/`
  - Photo-feed-first Discover page.
  - This is the primary landing page.
- `/places/[placeId]`
  - Place detail with gallery, metadata, comments, save action, and add-photo entry.
- `/profile/[userId]`
  - Public fictional photographer profile.
- `/saved`
  - Saved places/photos view.

Optional if time remains:

- `/map`
  - Dedicated stylized map/list view.
- `/add`
  - Dedicated upload page. Prefer a modal/drawer first if faster.

## 4. Suggested File Structure

If using Next.js:

```text
app/
  layout.tsx
  page.tsx
  globals.css
  places/
    [placeId]/
      page.tsx
  profile/
    [userId]/
      page.tsx
  saved/
    page.tsx
components/
  app-shell.tsx
  top-nav.tsx
  photo-feed.tsx
  photo-card.tsx
  place-card.tsx
  place-detail.tsx
  upload-modal.tsx
  comment-thread.tsx
  stylized-map.tsx
  profile-summary.tsx
  saved-panel.tsx
lib/
  data.ts
  types.ts
  storage.ts
  scoring.ts
  geo.ts
public/
  seed/
    photos/
    avatars/
```

Keep files small enough for another model to reason about. Prefer clear props and simple local state over clever abstractions.

## 5. Data Types

Create TypeScript types in `lib/types.ts`.

```ts
export type User = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  bio: string;
  homeArea: string;
  followerCount: number;
  followingCount: number;
  isInfluencer?: boolean;
};

export type Area = {
  id: string;
  name: string;
  region: string;
  centerLat: number;
  centerLng: number;
  description: string;
  coverPhotoUrl: string;
};

export type Place = {
  id: string;
  areaId: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  fuzzyLocationLabel: string;
  timCurated: boolean;
  saveCount: number;
  recentActivityScore: number;
  bestTimes: string[];
  tags: string[];
  coverPhotoUrl: string;
};

export type Photo = {
  id: string;
  placeId: string;
  userId: string;
  imageUrl: string;
  caption: string;
  locationLabel: string;
  metadataText?: string;
  shotAtTimeOfDay?: string;
  tags: string[];
  createdAt: string;
  likeCount: number;
};

export type Comment = {
  id: string;
  photoId: string;
  userId: string;
  body: string;
  createdAt: string;
  likeCount: number;
  replies: Reply[];
};

export type Reply = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  likeCount: number;
};
```

Local UI state should also track:

- saved place ids
- followed user ids
- liked photo ids
- liked comment ids
- liked reply ids
- uploaded photos
- added comments/replies

## 6. Seed Data

Create seed data in `lib/data.ts`.

Use fictional photographer names and avatars. User-provided photos will be added later by Tim, so include placeholder paths and make the app resilient if files are missing.

Recommended SF/California public-access places:

- Golden Gate Bridge Overlook
- Baker Beach
- Palace of Fine Arts
- Twin Peaks
- Lands End Trail
- Sutro Baths
- Embarcadero Waterfront
- Dolores Park
- Painted Ladies / Alamo Square
- Battery Spencer

Use somewhat exact coordinates, but avoid implying unsafe or private access. Show user-facing labels like "Near Battery Spencer" or "North beach overlook" rather than overly precise secret-spot wording.

Top-tier sorting:

1. Tim-curated places first.
2. Then high save count.
3. Then recent activity.

Implement this in `lib/scoring.ts`.

## 7. Local Persistence

Implement `lib/storage.ts` with safe wrappers:

- `loadDemoState()`
- `saveDemoState(state)`
- `resetDemoState()`

Store under one localStorage key, for example:

```ts
const STORAGE_KEY = "oculi-demo-state-v1";
```

Persist:

- saved places
- followed users
- likes
- uploaded local photos where possible
- comments/replies

Important: local image object URLs do not survive refresh reliably. For the showcase, support upload preview and in-session persistence. If base64 storage is used, warn in code comments that it is demo-only and can bloat localStorage.

## 8. Core UI Requirements

### App Shell

- Clean, sleek, modern social-app feel.
- Desktop showcase priority, but responsive on mobile.
- No marketing landing page.
- Header should include Oculi wordmark, area selector, Add Photo action, Saved/Profile shortcuts.
- First viewport should show the photo feed immediately.

Avoid copying Beli's UI. Borrow the mechanics only.

### Discover Feed

Must include:

- Photo feed as the main visual surface.
- Top Places module.
- Friend-first activity or recommendations.
- Occasional influencer/photographer recommendations after friend content.
- Save/favorite actions.
- Follow/unfollow actions.
- Comments/replies/likes affordances.
- Stylized map preview or side panel.

Desktop layout suggestion:

- Main center column: photo feed.
- Right rail: top places and stylized map.
- Left/top nav: app navigation and filters.

Mobile layout:

- Single-column feed.
- Sticky bottom or top navigation.
- Map/top places collapsed into cards.

### Photo Card

Each photo card should show:

- Image.
- Photographer name/avatar.
- Place name and fuzzy location label.
- Caption.
- Tags.
- Location/place metadata prominently.
- Optional metadata text.
- Like button.
- Comment count and comment entry.
- Save place button.
- Follow button if not already following.

### Place Detail

Each place detail page should show:

- Hero image/gallery.
- Place name.
- Fuzzy location.
- Tags.
- Best times.
- Top-tier reason: Tim-curated, highly saved, or recently active.
- Save/favorite button.
- Photo gallery from that place.
- Comments/likes/replies on photos.
- Add photo button.

### Upload Flow

Actual browser image upload is required.

Upload flow fields:

- Image file input.
- Preview.
- Location/place selection.
- Use current location button.
- Simulated location button or fallback.
- Caption.
- Simple text box for optional camera/photo metadata.
- Tags.
- Submit button.

Behavior:

- If browser geolocation succeeds, show an approximate area label and allow the user to choose the nearest seeded place.
- If geolocation fails or is denied, show a friendly fallback and use simulated SF location.
- On submit, add the photo to local state and show it in the feed without needing a backend.

### Comments, Replies, Likes

Implement local interactions:

- Like/unlike photos.
- Add comment to a photo.
- Like/unlike comments.
- Reply to comments.
- Like/unlike replies.

Keep the UI simple enough to finish tonight.

### Stylized Map

Build a local/stylized map first.

Requirements:

- Show seeded places as pins/cards using San Francisco coordinates.
- Allow selecting a pin/card to focus a place.
- Use fuzzy labels.
- Keep props/data shaped so a Mapbox component can replace it later.

Mapbox future boundary:

- Component should accept `places`, `selectedPlaceId`, and `onSelectPlace`.
- Do not hard-code map logic throughout the app.
- If Mapbox is wired later, use the same props.

## 9. Interaction State

Use a top-level client state provider or lightweight hook.

Required actions:

- `toggleSavedPlace(placeId)`
- `toggleFollowUser(userId)`
- `togglePhotoLike(photoId)`
- `addPhoto(input)`
- `addComment(photoId, body)`
- `toggleCommentLike(commentId)`
- `addReply(commentId, body)`
- `toggleReplyLike(replyId)`

No auth. Treat the current user as a seeded fictional user, for example:

- name: Tim
- username: `@tim`
- avatar: local placeholder

## 10. Visual Direction

Use a clean social-app design for photographers and casual users.

Suggested style:

- Light or near-white background.
- High-quality image surfaces.
- Crisp cards with radius 8px or less.
- Minimal color accents.
- Strong typography hierarchy.
- Dense but breathable desktop layout.
- Avoid purple gradient/orb aesthetics.
- Avoid heavy marketing-copy hero.

The app should feel modern and visual, not like an admin dashboard.

## 11. Accessibility And Responsive Checks

Implement:

- Keyboard-accessible buttons.
- Visible focus states.
- Alt text for seed images.
- Proper labels for file input, comment input, and upload fields.
- Responsive layout at desktop and mobile widths.
- No text clipping or overlapping.

## 12. Build Order

Follow this order exactly:

1. Scaffold the app and base styling.
2. Add `types.ts`, `data.ts`, `scoring.ts`, and `storage.ts`.
3. Build app shell and direct-to-feed home page.
4. Build photo feed and photo card.
5. Build save/follow/like local interactions.
6. Build comments, replies, and likes.
7. Build place detail route.
8. Build upload modal with local image preview/persistence.
9. Build stylized local map component.
10. Build profile and saved pages.
11. Add responsive polish.
12. Run verification.

Do not start backend/auth/cloud upload until the above is complete and Tim explicitly asks for it.

## 13. Verification Checklist

Run:

- install dependencies
- lint
- typecheck
- build
- launch local dev server
- browser smoke test

Manual browser demo path:

1. Open `/`.
2. Confirm the photo feed appears immediately.
3. Save a place from a photo card.
4. Follow a fictional photographer.
5. Like a photo.
6. Add a comment.
7. Reply to a comment.
8. Like the comment or reply.
9. Open a place detail page.
10. Upload a local image with a selected place/location.
11. Confirm uploaded photo appears in the feed.
12. Open `/saved` and confirm saved state appears.
13. Open a profile page and confirm follow state.
14. Resize to mobile width and confirm no overlap/clipping.

If using Playwright or browser automation, capture screenshots for:

- desktop home feed
- mobile home feed
- upload modal with preview
- place detail
- saved/profile state

## 14. Known Non-Goals

Do not implement unless Tim explicitly asks:

- Real auth.
- Cloud image upload/storage.
- Production database.
- Full recommendation engine.
- Native mobile app.
- Google Places search/details.
- Instagram/TikTok/Google Maps imports.
- Real-time notifications.
- Private profiles.
- Large multi-city database.

## 15. Likely Failure Points

Watch these carefully:

- Spending too long on real Mapbox setup before the feed works.
- Building backend/auth before the local demo is polished.
- Using weak placeholder imagery and making the product feel empty.
- Making comments/replies too complex.
- Letting upload persistence become a storage project.
- Copying Beli's UI instead of translating its mechanics.

The showcase succeeds if the feed, save/follow, upload, comments, and place discovery feel coherent and polished.

