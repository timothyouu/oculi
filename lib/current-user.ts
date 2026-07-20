import type { EditableProfile, User } from "./types";

/**
 * Builds the current viewer's display `User` record
 * (docs/demo-to-product-implementation.md item 3: retiring the fictional
 * `user-guest` persona as "you"). The viewer's *id* must always be the
 * real, resolved identity (`viewerId` -- either a Supabase auth uid or the
 * pre-auth visitor id fallback), never the fictional seed persona's id.
 * Only the *display* fields (name/avatar/bio/homeArea/etc.) default to the
 * seed persona's template (`seedTemplate`) -- the anonymous visitor's
 * default, editable display profile -- and are overridden by anything the
 * visitor has actually edited (`profile`).
 */
export function buildCurrentUser(seedTemplate: User, viewerId: string, profile: EditableProfile): User {
  return { ...seedTemplate, ...profile, id: viewerId };
}

/**
 * Builds the full "visible users" list: every catalog user, with the real
 * viewer's own record present under their real id. Seed/starter content
 * still authored by the fictional persona (e.g. lib/storage.ts's
 * `starterUploadedPhotos`) keeps that persona as a distinct, separate list
 * entry -- so the fictional seed user is filtered out only if its id
 * happens to collide with the viewer's real id (which only happens during
 * the brief pre-auth-bootstrap window where `viewerId` is still the
 * placeholder value), never unconditionally.
 */
export function buildVisibleUsers(users: User[], viewerId: string, currentUser: User): User[] {
  return [...users.filter((user) => user.id !== viewerId), currentUser];
}
