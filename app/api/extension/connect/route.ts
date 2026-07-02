/**
 * POST /api/extension/connect
 *
 * One-click extension connect: authenticates via the Supabase session cookie
 * already present in this browser profile, mints an extension token, and
 * returns it together with the user's identity so the extension can show
 * which account it connected to.
 *
 * Called by the Braevity extension with credentials:"include". The request
 * arrives with Origin: chrome-extension://<id>, which the same-origin CSRF
 * check used elsewhere would reject — so this route has its own origin rule:
 * only chrome-extension origins are accepted (regular web pages can never
 * send that origin, which is what the CSRF check exists to prevent).
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

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  if (!origin.startsWith("chrome-extension://")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  return NextResponse.json({
    token,
    email: profile?.email ?? user.email ?? null,
    full_name: profile?.full_name ?? null,
  });
}
