/**
 * GET  /api/extension/token  — validate token (used by extension "Test connection")
 * POST /api/extension/token  — generate a new token (session auth)
 * DELETE /api/extension/token — revoke a token (session auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, randomBytes } from "crypto";
import { isSameOrigin } from "@/lib/security/csrf";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

function generateToken(): string {
  return "nrt_" + randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// GET — two modes:
//   Bearer token → validate it (extension "Test connection")
//   Session cookie → list all tokens for the logged-in user (settings page)
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`ext-token:get:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const supabase = await createClient();
  const admin = createAdminClient();

  if (bearerToken) {
    const tokenHash = hashToken(bearerToken);
    const tokenRl = rateLimit(`ext-token:get:tk:${tokenHash}`, 30, 60_000);
    if (!tokenRl.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { data: row } = await admin
      .from("extension_tokens")
      .select("id, name")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!row) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    admin
      .from("extension_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(() => {});

    return NextResponse.json({ ok: true, name: row.name });
  }

  // Session mode — list user's tokens for settings page
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows } = await supabase
    .from("extension_tokens")
    .select("id, name, last_used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ tokens: rows ?? [] });
}

// POST — create a new token (session required)
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = rateLimit(`ext-token:post:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userRl = rateLimit(`ext-token:post:u:${user.id}`, 10, 60_000);
  if (!userRl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as { name?: string };
  const name = (body.name ?? "Browser Extension").slice(0, 80);
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();

  const { data, error } = await admin
    .from("extension_tokens")
    .insert({ user_id: user.id, token_hash: tokenHash, name, expires_at: expiresAt })
    .select("id, name, created_at, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    token,
    name: data.name,
    created_at: data.created_at,
    expires_at: data.expires_at,
  });
}

// DELETE — revoke a token by id (session required)
export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = rateLimit(`ext-token:delete:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userRl = rateLimit(`ext-token:delete:u:${user.id}`, 10, 60_000);
  if (!userRl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as { id?: string; all?: boolean };
  if (!body.id && !body.all) return NextResponse.json({ error: "id or all required" }, { status: 400 });

  let query = admin
    .from("extension_tokens")
    .delete()
    .eq("user_id", user.id);

  if (!body.all) query = query.eq("id", body.id as string);

  await query;

  return NextResponse.json({ ok: true });
}
