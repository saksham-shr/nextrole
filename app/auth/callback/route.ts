import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Use the pinned site URL so redirects are consistent across Vercel's
  // internal host and the public domain (avoids landing-page fallback from
  // Supabase when the dynamic origin doesn't match the allowlist).
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextrole.live").replace(/\/$/, "");

  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // Decode the next param (encoded by signInWithOAuth) and restrict to safe relative paths.
  const next = rawNext ? decodeURIComponent(rawNext) : "/dashboard";
  const safePath = next.startsWith("/") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${siteOrigin}/login?error=Missing+confirmation+code`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.redirect(`${siteOrigin}/login?error=Supabase+is+not+configured`);
  }

  const response = NextResponse.redirect(`${siteOrigin}${safePath}`);

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${siteOrigin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Send to onboarding if not yet completed. This covers both email signups
  // and Google OAuth users arriving from the login page (next=/dashboard).
  // Also fires for brand-new Google users who have no profile row yet.
  if (!safePath.startsWith("/reset-password") && !safePath.startsWith("/connect-extension") && safePath !== "/onboarding") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      // No profile row OR onboarding not done → go to onboarding
      if (!profile?.onboarding_completed) {
        return NextResponse.redirect(`${siteOrigin}/onboarding`);
      }
    }
  }

  return response;
}
