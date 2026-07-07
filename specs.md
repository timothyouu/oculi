# Oculi Project Spec

Status: Planning complete. Do not build until Tim explicitly asks to start implementation.

Due date context: Codex showcase due tonight, July 7, 2026.

App name: Oculi.

Working concept: a Beli-inspired social discovery app for photo spots. Users find beautiful places to shoot, view real photos taken there, save/favorite spots, follow other photographers/friends, and add photos either from their current location or by selecting a known place.

Important inspiration note: the inspiration is definitely Beli, the restaurant list/ranking app, but Oculi should not copy Beli's UI. Borrow product mechanics only: ranked places, lists, social discovery, favorites, follow graph, and activity.

## 1. Product Goal

Create a showcase-ready website that answers two main questions quickly:

"Where should I go nearby to take amazing photos, and what kind of photos can I expect to get there?"

"What are my friends and other photographers finding, saving, and shooting?"

The site should make photo locations feel browsable, social, and ranked in the same spirit as Beli does for restaurants while establishing its own visual identity.

## 2. Core Users

These user types need confirmation from Tim before implementation:

- Casual explorer: wants nearby pretty places and example shots.
- Photographer: wants lighting, angle, subject, timing, and saved shoot locations.
- Social user: wants to follow people, see friends' spots, and save/favorite locations. This is a primary user motive.
- Showcase judge: needs to understand the product in under 60 seconds without creating real data.

## 3. MVP Scope For Tonight

The recommended showcase MVP should be small enough to finish, visually strong enough to demo, and not dependent on expensive external services unless Tim confirms them.

Required MVP features:

- Home/discover page with a photo-first grid of places.
- Location/place detail page showing a gallery of photos taken there.
- Ranked/top places section for a selected area.
- Prepopulated places for California/San Francisco.
- Add photo flow with two choices:
  - use current location
  - select an existing place/area
- Favorite/save place action.
- Follow/unfollow photographer action.
- Comments on photos.
- Photo metadata fields, with location/place as the most important required field. Camera details can be optional.
- Basic profile page with saved places, uploaded photos, follower/following counts.
- Demo data that makes the app feel alive immediately.
- Seed photos should be user-provided by Tim where possible.
- A local/stylized map-like view of updated places for tonight, with Mapbox planned as the real map provider. Tim is fine with Mapbox. Use seeded Oculi places instead of expensive place search APIs. Consider Google Maps/Places later only if Oculi needs authoritative POI search, place details, or reviews.
- Actual image upload in the browser using local preview/persistence.
- Photo-feed-first first screen.
- No onboarding for the demo; drop users directly into the photo feed.
- Responsive UI with desktop showcase priority and good mobile behavior.

Stretch features only after the MVP works:

- Friend activity feed.
- "Want to shoot" and "Shot here" lists.
- Tags for photo style, lighting, difficulty, crowd level, and best time.
- Personalized recommendations.
- Match score between users.
- Leaderboard or streaks.
- Invite/friend discovery.
- Map view.
- Richer comments/notes on photos.
- Real upload storage and auth.
- Google Places search/details.

## 4. Beli-Inspired Features To Discuss

Researched Beli references:

- Official Beli site: https://beliapp.com/
- Apple App Store listing: https://apps.apple.com/us/app/beli/id1478375386
- Google Play listing: https://play.google.com/store/apps/details?id=com.beliapp.myapp

Beli capabilities worth translating:

- Organized lists and maps of places users have been and want to try.
  - Photo version: "Shot Here" and "Want To Shoot" lists.
- Friend/social discovery.
  - Photo version: see where followed photographers are shooting and what they saved.
- Personalized recommendations and top lists.
  - Photo version: recommend places based on saved styles, favorite subjects, and followed users.
- Tags and filters.
  - Photo version: golden hour, skyline, street, portrait, nature, architecture, low crowd, tripod-friendly, drone-friendly, rainy-day, night photography.
- Notes and favorite dishes.
  - Photo version: shooting notes, best lens, best entrance, parking notes, tripod warnings, best composition.
- Taste profile and match score.
  - Photo version: "Photo Style Profile" and "Match Score" with another photographer.
- Ranking/gamified comparison.
  - Photo version: ask users to compare two places they have shot and build a ranked personal list.
- Activity feed.
  - Photo version: latest photos and newly ranked/saved spots from followed users.
- Public/private profiles.
  - Photo version: users decide whether saved spots and uploads are visible.
- Leaderboards/streaks.
  - Photo version: top spot contributors, city explorers, weekly photo adds, or "new place streak."

Features that may be risky for tonight:

- True personalized recommendation algorithms.
- Real social graph with auth and privacy.
- Real geolocation-based upload validation.
- Real map/location search integrations.
- Moderation of user-uploaded photos.
- Importing from Instagram, TikTok, Google Maps, or camera EXIF data.

## 5. Proposed Information Architecture

Do not implement this exact IA until Tim confirms the remaining product priorities.

Main navigation:

- Discover
- Map or Areas
- Add Photo
- Saved
- Profile

Core pages:

- Discover page
  - Hero/search for area or city.
  - Top photo spots near selected area.
  - Recent uploads from followed users.
  - Style/category filters.
- Area page
  - Area name, short description, best times.
  - Top places in that area.
  - Photo grid from the area.
  - Filters by style and time of day.
- Place page
  - Place name, rank, location metadata.
  - Gallery of photos.
  - Save/favorite button.
  - "Want to shoot" and "Shot here" status.
  - Shooting notes/tags.
  - Add photo button.
- Add photo page/modal
  - Upload/select photo.
  - Choose "use my location" or "select place."
  - Add tags, caption, time of day, camera/lens optional.
  - Submit to demo dataset or backend depending on chosen architecture.
- Profile page
  - Uploaded photos.
  - Saved places.
  - Shot/want-to-shoot lists.
  - Followers/following counts.
  - Follow button when viewing another profile.

## 6. Data Model Draft

This is a planning model, not a final schema.

User:

- id
- name
- username
- avatarUrl
- bio
- homeArea
- followerCount
- followingCount
- savedPlaceIds
- followingUserIds

Area:

- id
- name
- region
- centerLat
- centerLng
- description
- coverPhotoUrl

Place:

- id
- areaId
- name
- description
- lat
- lng
- rankScore
- photoCount
- favoriteCount
- bestTimes
- tags
- coverPhotoUrl

Photo:

- id
- placeId
- userId
- imageUrl
- caption
- shotAtTimeOfDay
- tags
- createdAt

Favorite:

- userId
- placeId
- createdAt

Follow:

- followerUserId
- followedUserId
- createdAt

## 7. Implementation Phases

Phase 0: Clarify decisions before building.

- Target inspiration: Beli, but do not copy its UI.
- App name: Oculi.
- Initial geography/city: California/San Francisco.
- Main motive: friend/social sharing plus discovery.
- Tonight's build preference: mock/local demo first, with real backend/auth/uploads only if feasible after the demo works.
- Confirm visual style.
- Map direction: not mandatory as a full real integration tonight, but the app needs an updated map/map-like place view.
- Map provider recommendation: use Mapbox for the showcase map if an API key is easy to provide; fallback to a stylized local map/list if key setup slows the build.
- Final map decision for tonight: plan around Mapbox, but implement local/stylized map first. Wire Mapbox only if time remains or token setup is already ready.
- Place precision: somewhat exact pins, but not so exact that sensitive locations are exposed.
- Ranking decision: favorites/saves are enough for MVP; no Beli-like ranking required tonight.
- Top-tier definition: blend most saved, Tim-curated, and most recently active.
- Following priority: prioritize friends first, with occasional photographer/influencer recommendations after friend content.
- Location behavior: support both browser geolocation and simulated location.
- Auth decision: real auth is not required tonight.
- Upload decision: actual image upload is required; implement it as local/mock upload unless cloud storage is explicitly requested.
- Upload storage decision: local browser image upload/preview/persistence is acceptable for tonight.
- Profile visibility: public-only profiles for the showcase.
- Allowed locations: public-access landmarks, beaches, trails, and popular public spots.
- Visual direction: clean, sleek, modern social app for photographers and casual users.
- First screen priority: photo feed first.
- Metadata decision: location/place is the most important metadata in the MVP. Camera details are optional.
- Comments decision: include comments, replies, and likes on photos, comments, and replies in the MVP.
- Responsive priority: desktop showcase first, while still mobile-friendly/responsive.
- Seed identity decision: use fictional photographer names and avatars.
- Seed photo decision: use user-provided photos where possible.
- Seed photo source decision: Tim will add user-provided photos later.
- Onboarding decision: skip onboarding for this demo; drop users directly into the feed.

Phase 1: Repo setup.

- Choose the stack after Tim answers.
- Create project skeleton.
- Add lint/typecheck/build scripts.
- Add seed/demo data.
- Create image asset strategy.

Phase 2: Static showcase MVP.

- Build discover page.
- Build area/place detail pages.
- Build saved/favorite state in local state or localStorage.
- Build follow/unfollow state in local state or localStorage.
- Build add-photo UI that can append to local demo state or show a convincing success state.
- Build actual browser image upload with preview and local persistence.
- Build metadata fields into the upload flow. Prioritize location/place selection above camera details. Optional fields can include camera, lens, time of day, and editing style/preset if the UI has room.
- Use simple text boxes for optional camera metadata instead of separate detailed fields.
- Build comments on photo cards/detail views, including likes and replies.
- Build a stylized local map panel/list using seeded San Francisco coordinates. Keep the data/API boundary clean so Mapbox can replace the stylized view later.

Phase 3: Beli-like social layer.

- Add profile page.
- Add followers/following counts.
- Add simple activity feed.
- Add "Want to shoot" and "Shot here" lists.

Phase 4: Optional backend, only if Tim chooses it.

- Add auth.
- Add persistent database.
- Add photo storage.
- Add place/photo/follow/favorite APIs.
- Add permissions and privacy controls.

Backend priority note: because the showcase is due tonight, backend/auth/uploads should be attempted only after the local/mock demo path is polished. If added, keep the backend tiny and avoid expanding scope.

Auth/upload note: real auth is explicitly not required for tonight. Actual image upload is required, but can be implemented locally for the showcase.

Phase 5: Showcase polish.

- Create realistic seed data.
- Verify empty/loading/error states.
- Verify responsive behavior.
- Test the primary demo path.
- Add final README/demo script.

## 8. Step-by-Step Build Instructions For A Cheaper Model

Do not start these until Phase 0 questions are answered.

1. Read this file fully.
2. Read any AGENTS.md, SPEC.md, or WORKSTREAMS.md files if they are later added.
3. Create the chosen frontend project.
4. Add seed data for users, areas, places, photos, follows, and favorites.
5. Build the Discover page with:
   - area selector
   - top places grid
   - photo grid
   - save buttons
6. Build Place detail pages with:
   - title/location/tags
   - gallery
   - save/favorite
   - add-photo entry point
7. Build Add Photo flow with:
   - upload/select visual
   - choose current location or select place
   - tags/caption
   - submit success state
8. Build Profile page with:
   - user summary
   - uploaded photos
   - saved places
   - follow/unfollow button
9. Build an activity feed if time remains.
10. Run typecheck, lint, and build.
11. Open the site in a browser and verify the demo path.
12. Record unresolved limitations in README or this spec.

## 9. Key Decisions Needed

Product:

- Answered: primary motive is friend/social sharing plus discovery.
- Answered: top tier should consider most saved, Tim-curated, and most recently active.
- Answered directionally: places should be somewhat exact pins, but not too exact where safety/privacy is a concern.
- Answered: favorites/saves are enough for the MVP.
- Answered: following should prioritize friends, with occasional influencers after friend content.

Data/content:

- Answered: California/San Francisco should be prepopulated first.
- Answered: seed photos should be user-provided where possible.
- Answered: in-bounds locations are public-access landmarks, beaches, trails, and popular public spots.
- Answered: location/place is the most important metadata. Camera metadata can be optional.

Technical:

- Answered directionally: tonight should probably be mock/local demo, with real backend/auth/uploads if feasible after the demo is solid.
- Answered: real auth is not required tonight.
- Answered: actual image upload is required. Implement local/browser upload first; cloud upload is a stretch only if confirmed.
- Answered directionally: real map is not mandatory, but an updated map/map-like place view is needed.
- Answered: Mapbox is the preferred real map provider, but tonight can start with a local/stylized map.
- Answered: current location should support both real browser geolocation and simulated location.

Design:

- Answered: clean, sleek, modern social app for photographers and casual users.
- Answered: the first screen should prioritize the photo feed.
- Answered: responsive with desktop demo priority; still mobile-friendly.

## 10. Risks That Could Sink The Showcase

Highest-risk items:

- Real upload storage/auth can consume the night and create debugging risk.
- Map APIs can require keys, billing, CORS setup, and styling time. Use a local/stylized map first; wire Mapbox only after the core demo is stable.
- Real geolocation can fail due to permissions, browser context, HTTPS requirements, or desktop demo weirdness.
- Lack of high-quality photos will make the product feel weak even if the code works.
- A too-large Beli clone scope will dilute the demo and leave core flows unfinished.

Other risks:

- User-uploaded photos imply moderation, copyright, privacy, and safety concerns.
- Exact location sharing can expose sensitive, dangerous, private, or overcrowded spots.
- Social features without enough seed users feel empty.
- Ranking logic can feel arbitrary unless the scoring model is clear.
- If "top tier" depends on photo quality, the app needs either curation or a credible scoring proxy.

Risk mitigation:

- Use polished demo data unless Tim explicitly wants production persistence.
- Treat current location as a progressive enhancement.
- Use actual browser image upload locally before attempting storage.
- Keep comments, replies, and likes local so they do not trigger backend/auth scope.
- Keep metadata as optional form fields, not EXIF parsing, unless time remains.
- Seed one highly photogenic city/area deeply instead of many shallow areas.
- Make the first viewport visually obvious: beautiful places, ranked spots, and saved/follow actions.
- Keep backend features behind a decision gate.

## 11. Open Questions For Tim

Please answer these before build starts:

Answered:

- Inspiration: definitely Beli, but do not copy Beli's UI.
- App name: Oculi.
- First geography: California/San Francisco.
- Main motive: friend/social sharing plus discovery.
- Tonight's approach: mock/local demo first, real backend/auth/uploads only if feasible.
- Map: not mandatory as a full production integration, but Oculi needs an updated map/map-like place view. Recommendation is Mapbox for the MVP.
- Map implementation: plan for Mapbox, but local/stylized map is fine for tonight.
- Place precision: somewhat exact pins, but fuzziness is acceptable.
- MVP interaction: favorites/saves are enough; no ranking system needed tonight.
- Top-tier scoring: blend most saved, Tim-curated, and most recently active.
- Follow graph: prioritize friends, with occasional influencer/photographer recommendations.
- Location: support both browser geolocation and simulated location.
- Auth: real auth is not required tonight.
- Upload: actual image upload is required, with local browser preview/persistence accepted.
- Visual mood: clean, sleek, modern social app for photographers and casuals.
- Profiles: public-only for showcase.
- Allowed places: public-access landmarks, beaches, trails, and popular spots.
- First screen: photo feed.
- Metadata: location/place is most important; camera fields can be optional.
- Comments: comments should include replies and likes; likes apply to photos, comments, and replies.
- Responsive target: desktop showcase priority, with mobile-friendly responsive behavior.
- Seed users: use fictional photographer names and avatars.
- Seed photos: use user-provided photos where possible.
- Seed photo source: Tim will add user-provided photos later.
- Optional camera metadata: use simple text boxes.
- Onboarding: skip onboarding and drop users directly into the feed.

Still open:

- None. The plan is ready for implementation when Tim asks to build.

## 12. Recommended Demo Path Once Built

This path should be possible in under 60 seconds:

1. Open Discover.
2. Pick the prepopulated area.
3. View top ranked photo locations.
4. Open a place and scan the gallery.
5. Save/favorite the place.
6. Follow the photographer who uploaded a strong photo.
7. Add a photo by selecting the same place or using current location.
8. Show the profile page with saved places and follower/following state.

## 13. Non-Goals Until Confirmed

- Native mobile app.
- Production-scale uploads.
- Full recommendation engine.
- Full moderation workflow.
- Payments or premium features.
- Import from Instagram/TikTok/Google Maps.
- Large multi-city database.
- Real-time notifications.
