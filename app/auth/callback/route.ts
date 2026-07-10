import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Standard @supabase/ssr App Router OAuth callback: exchanges the `code`
// query param for a session and writes the resulting auth cookies onto the
// redirect response. Used by the "Sign in with Google" identity upgrade on
// the profile page (lib/auth-session.ts calls supabase.auth.linkIdentity /
// signInWithOAuth with redirectTo: `${origin}/auth/callback`).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("next") ?? "/profile";

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const response = NextResponse.redirect(`${origin}${redirectTo}`);
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return response;

      console.warn("Unable to exchange Supabase OAuth code for a session.", error.message);
    }
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
