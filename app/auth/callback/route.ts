import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // We need a mutable cookie jar to exchange the code, then sign out.
    const cookieStore: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            const header = request.headers.get("cookie") ?? "";
            return header
              .split(";")
              .filter(Boolean)
              .map((c) => {
                const [name, ...rest] = c.trim().split("=");
                return { name: name.trim(), value: rest.join("=") };
              });
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => cookieStore.push(c));
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // ── Email confirmation flow ───────────────────────────────────────────
      // The code exchange confirmed the email and created a session. If the
      // intended destination is NOT the dashboard (e.g. password reset), let
      // the session live and redirect there normally.
      // For email confirmations (next === "/dashboard") we sign the user back
      // out so they land on the login page — they should sign in deliberately.
      if (next === "/dashboard") {
        await supabase.auth.signOut();

        const loginResponse = NextResponse.redirect(
          `${origin}/login?message=${encodeURIComponent("Email confirmed — you can now sign in")}`,
        );
        // Clear any session cookies that were set during the exchange
        cookieStore.forEach(({ name, options }) => {
          loginResponse.cookies.set(name, "", {
            ...((options as Record<string, unknown>) ?? {}),
            maxAge: 0,
          });
        });
        return loginResponse;
      }

      // Password reset or any other flow — keep the session and redirect.
      const response = NextResponse.redirect(`${origin}${next}`);
      cookieStore.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, (options as Parameters<typeof response.cookies.set>[2]) ?? {});
      });
      return response;
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=Could+not+authenticate+user`,
  );
}
