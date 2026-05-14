import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextrole.live").replace(/\/$/, "");

  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const next = rawNext ? decodeURIComponent(rawNext) : "/dashboard";
  // Restrict to safe relative paths only.
  const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${siteOrigin}/login?error=Missing+confirmation+code`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.redirect(`${siteOrigin}/login?error=Supabase+is+not+configured`);
  }

  // All redirects share this helper so session cookies are never dropped.
  function makeRedirect(path: string) {
    return NextResponse.redirect(`${siteOrigin}${path}`);
  }

  // Start with the happy-path redirect. Cookies will be written onto this
  // response by the setAll handler, then copied to any other redirect we return.
  let response = makeRedirect(safePath);

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
    return makeRedirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Redirect to onboarding when profile is missing or not yet completed.
  // This covers email signups, Google OAuth from the login page, and brand-new
  // Google users who have no profile row yet.
  if (safePath !== "/onboarding" && !safePath.startsWith("/reset-password") && !safePath.startsWith("/connect-extension")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!profile?.onboarding_completed) {
        // Swap the destination but keep the same response object so cookies
        // set by exchangeCodeForSession travel with the redirect.
        const onboardingRedirect = makeRedirect("/onboarding");
        response.cookies.getAll().forEach(({ name, value, ...rest }) => {
          onboardingRedirect.cookies.set(name, value, rest);
        });
        return onboardingRedirect;
      }
    }
  }

  return response;
}
