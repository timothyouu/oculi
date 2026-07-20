// Pure moderation-visibility predicate for `public.photos` rows
// (docs/demo-to-product-implementation.md item 6). RLS on `public.photos`
// allows public SELECT on every row regardless of `moderation_status` (see
// 20260710000400_create_photos_table.sql) -- moderation is an app-level
// concern, not a row-security one. Product decision: `approved` and
// `pending` photos are public; `rejected` photos are hidden from everyone
// except their own owner, so an uploader can still see (and eventually
// resubmit/appeal) their own rejected photo instead of it just vanishing.
//
// This predicate is the actual enforcement point -- it runs on every
// hydrated `public.photos` row regardless of what the SQL query itself
// already filtered out, so a stale mock, a future query change, or a
// mis-scoped RLS policy can't leak a rejected photo into the public feed.

export type ModeratedPhotoRow = {
  moderationStatus: string | null | undefined;
  ownerId: string | null | undefined;
};

export function isPhotoVisibleToViewer(row: ModeratedPhotoRow, viewerId: string | null): boolean {
  if (row.moderationStatus !== "rejected") return true;
  return Boolean(viewerId) && row.ownerId === viewerId;
}
