import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * PKCE code-exchange landing route.
 *
 * Supabase redirects users here after they confirm their email or click a
 * password-reset link. We swap the `code` for a session, write the resulting
 * sb-* cookies onto the redirect response, and forward the user to `next`.
 *
 * Cookie handling notes:
 * - Use NextRequest's `cookies` API (not manual `Cookie` header parsing) so
 *   we get correctly URL-decoded values for JWT-shaped cookie values.
 * - Write the new cookies onto the SAME redirect response we return — that's
 *   the only way Set-Cookie reaches the browser from a Route Handler.
 * - Mirror writes onto `request.cookies` too so subsequent reads inside this
 *   handler see the freshly-set session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=Missing+confirmation+code`,
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.redirect(
      `${origin}/login?error=Supabase+is+not+configured`,
    );
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Mirror onto the request so Supabase reads consistent state.
          request.cookies.set(name, value);
          // Actually send it to the browser.
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // For OAuth sign-ins the caller passes next=/dashboard (login page) or
  // next=/onboarding (signup page). But a first-time OAuth user arriving from
  // the login page would land on /dashboard without completing onboarding.
  // Override: if onboarding isn't done yet, always send them to /onboarding.
  if (next !== "/onboarding" && !next.startsWith("/reset-password") && !next.startsWith("/connect-extension")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      if (profile && !profile.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  return response;
}
