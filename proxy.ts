import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/proxy";
import { getSupabaseEnv } from "@/lib/supabase/config";

const authOnlyPaths = ["/login", "/signup", "/forgot-password"];
const ADMIN_EMAIL = "sakshamsharma614@gmail.com";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const { url, publishableKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured || !url || !publishableKey) {
    return response;
  }

  const hasAuthCookies = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasAuthCookies) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Allow the signup confirmation screen through even when logged in
  // (/signup?step=confirm) — the user just created their account and needs
  // to see the "check your inbox" screen before the session is usable.
  const isConfirmScreen =
    pathname === "/signup" &&
    request.nextUrl.searchParams.get("step") === "confirm";

  if (authOnlyPaths.includes(pathname) && hasAuthCookies && !isConfirmScreen) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard/admin")) {
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

    if ((user?.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
