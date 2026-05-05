import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/proxy";
import { getSupabaseEnv } from "@/lib/supabase/config";

// Pages that should bounce a logged-in user back to the dashboard. The
// recovery pages (verify-code, reset-password) intentionally stay reachable
// while authenticated — the user just arrived from a recovery email and is
// signed in to a temporary recovery session.
const authOnlyPaths = ["/login", "/signup", "/forgot-password"];
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

/**
 * Copy any Set-Cookie headers that updateSession wrote onto `source` into
 * the new redirect `target`, so refreshed tokens are never silently dropped.
 */
function copyAuthCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...rest }) => {
    if (name.startsWith("sb-")) {
      target.cookies.set(name, value, rest);
    }
  });
}

/** Redirect helper that preserves any refreshed auth cookies. */
function redirectWithCookies(
  url: URL | string,
  source: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(url);
  copyAuthCookies(source, redirect);
  return redirect;
}

export async function proxy(request: NextRequest) {
  // updateSession refreshes the access token when it's close to expiry and
  // writes the new tokens into `response.cookies`. Every path below must
  // either return `response` directly OR carry those cookies forward.
  const response = await updateSession(request);
  const { url, publishableKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured || !url || !publishableKey) {
    return response;
  }

  // Validate the session server-side. Cookie presence alone is not reliable:
  // stale sb-* cookies can exist even when the session is invalid, which can
  // cause login/signup redirect loops.
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return redirectWithCookies(new URL("/login", request.url), response);
  }

  if (authOnlyPaths.includes(pathname) && isAuthenticated) {
    return redirectWithCookies(new URL("/dashboard", request.url), response);
  }

  if (pathname.startsWith("/dashboard/admin")) {
    if ((user?.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
      return redirectWithCookies(new URL("/dashboard", request.url), response);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
