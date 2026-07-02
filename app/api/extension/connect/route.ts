/**
 * POST /api/extension/connect
 *
 * One-click extension connect: authenticates via the Supabase session cookie
 * already present in this browser profile, mints an extension token, and
 * returns it together with the user's identity so the extension can show
 * which account it connected to.
 *
 * Called by the Braevity extension with credentials:"include". CSRF protection
 * comes from Supabase session cookies being SameSite=Lax (cross-site POSTs
 * from other origins don't carry them) plus per-IP and per-user rate limits.
 * An Origin header check is not used because Vercel's edge strips non-http
 * Origin values (chrome-extension://) before they reach the function.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

function generateToken(): string {
  return "nrt_" + randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  // Note: credentials:include + wildcard origin is normally invalid, but
  // chrome-extension:// pages bypass the browser's CORS enforcement when the
  // extension declares host permissions. The wildcard lets any extension read
  // the response body (origin check was replaced by session-cookie auth below).
};

// Handle CORS preflight sent by Chrome before a credentialed POST
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  // Origin check removed: Vercel's edge strips non-http Origin headers so
  // "chrome-extension://" never arrives. Real protection: the Supabase session
  // cookie is SameSite=Lax (cross-site POSTs don't carry it) + rate limiting.

  const ip = getClientIp(request);
  const rl = await rateLimit(`ext-connect:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRl = await rateLimit(`ext-connect:u:${user.id}`, 10, 60_000);
  if (!userRl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = createAdminClient();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();

  const { error } = await admin.from("extension_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    name: "Browser Extension",
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[extension/connect] insert error:", error.message);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single();

  return NextResponse.json(
    {
      token,
      email: profile?.email ?? user.email ?? null,
      full_name: profile?.full_name ?? null,
    },
    { headers: CORS_HEADERS },
  );
}
