"use client";

import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  isAnonymous: boolean;
};

export function sessionToAuthUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const identities = session.user.identities ?? [];
  const isAnonymous = identities.length === 0;
  const metadata = session.user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    (typeof metadata?.name === "string" && metadata.name) ||
    null;

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name,
    isAnonymous,
  };
}

/**
 * Returns the current Supabase auth session, creating a real anonymous
 * session (supabase.auth.signInAnonymously) if none exists yet. Every
 * visitor gets a session id this way with no login wall - see
 * docs/demo-to-product-audit.md item 1. Returns null only when Supabase
 * itself isn't configured or the anonymous sign-in request fails, in which
 * case callers should fall back to the legacy localStorage-only flow.
 */
export async function ensureAuthSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.warn("Unable to read the Supabase auth session.", sessionError.message);
  }
  if (sessionData?.session) return sessionData.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("Unable to start an anonymous Supabase session.", error.message);
    return null;
  }
  return data.session;
}

export type GoogleUpgradeResult =
  | { ok: true; usedFallback: false }
  | { ok: true; usedFallback: true }
  | { ok: false; error: string };

/**
 * Upgrades the current anonymous identity to a Google account in place
 * (same auth uid, so state keyed by that uid follows automatically) via
 * `linkIdentity`. That call requires the Supabase project's "manual
 * linking" setting to be enabled; if it isn't, this falls back to a plain
 * `signInWithOAuth`, which signs the visitor into a *new* Google-backed
 * identity instead of upgrading the anonymous one (state will not carry
 * over automatically in that fallback path - report this so the dashboard
 * toggle can be flipped).
 */
export async function signInWithGoogleUpgrade(redirectTo: string): Promise<GoogleUpgradeResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo },
  });

  if (!error) {
    if (data?.url && typeof window !== "undefined") window.location.assign(data.url);
    return { ok: true, usedFallback: false };
  }

  const manualLinkingDisabled = /manual linking is disabled/i.test(error.message);
  if (!manualLinkingDisabled) {
    return { ok: false, error: error.message };
  }

  console.warn(
    "Supabase project has manual identity linking disabled; falling back to signInWithOAuth. " +
      "Enable 'Allow manual linking' in the Supabase Auth dashboard to upgrade the anonymous " +
      "identity in place instead of creating a separate Google-backed identity.",
  );

  const fallback = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (fallback.error) return { ok: false, error: fallback.error.message };
  if (fallback.data?.url && typeof window !== "undefined") window.location.assign(fallback.data.url);
  return { ok: true, usedFallback: true };
}

/**
 * Signs the current user out and immediately establishes a fresh anonymous
 * session so the visitor is never left without a session id.
 */
export async function signOutToFreshAnonymousSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { error } = await supabase.auth.signOut();
  if (error) console.warn("Unable to sign out of Supabase.", error.message);

  const { data, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) {
    console.warn("Unable to start a fresh anonymous Supabase session after sign-out.", signInError.message);
    return null;
  }
  return data.session;
}
