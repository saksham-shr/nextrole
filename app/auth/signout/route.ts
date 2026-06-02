/**
 * GET /auth/signout?next=<url>
 *
 * GET-able sign-out endpoint. Lets the browser extension open a tab that
 * signs the user out of nextrole.live + redirects them somewhere useful
 * (typically /connect-extension?redirect_to=... so they can immediately
 * re-bind the extension to a different account).
 *
 * `next` MUST be a same-origin URL — protects against open-redirect abuse.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function isSafeNext(next: string | null, origin: string): boolean {
  if (!next) return false;
  try {
    const u = new URL(next, origin);
    return u.origin === origin;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Default to local so convenience sign-outs (account switch, extension
  // re-bind) don't kill the user's sessions on every other device. Callers
  // that genuinely need a global sign-out can opt in with ?scope=global.
  const scopeParam = req.nextUrl.searchParams.get("scope");
  const scope = scopeParam === "global" ? "global" : "local";
  await supabase.auth.signOut({ scope });

  // Belt-and-suspenders: explicitly delete every sb-* cookie.
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.delete(cookie.name);
    }
  }

  const origin = new URL(req.url).origin;
  const next = req.nextUrl.searchParams.get("next");
  const target = isSafeNext(next, origin) ? next! : "/login";

  return NextResponse.redirect(new URL(target, origin));
}
