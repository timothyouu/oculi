import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Cookie-backed browser client (via @supabase/ssr) so the auth session is
// visible to the app/auth/callback route handler during the OAuth code
// exchange, not just to client-side JS. Anonymous-first bootstrap and the
// Google identity upgrade both rely on this being the same client instance
// used everywhere state reads/writes happen.
export function getSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
