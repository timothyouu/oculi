/**
 * Builds the ordered list of photo ids the discover deck should show, excluding
 * already-swiped-past photos while always keeping the resume anchor (the photo the
 * user was last looking at) in the queue, even though viewing it marks it "viewed".
 * Without the resume-anchor guarantee, reloading the app would drop the last-viewed
 * photo from the queue and land on a different, shifted index instead.
 */
export function buildResumableQueue(
  allPhotoIds: string[],
  viewedPhotoIds: string[],
  resumePhotoId?: string,
): string[] {
  const viewedSet = new Set(viewedPhotoIds);
  return allPhotoIds.filter((photoId) => photoId === resumePhotoId || !viewedSet.has(photoId));
}
