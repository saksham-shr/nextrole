import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { email?: string; tier?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const tier = body.tier ?? "";

  if (!email || !["starter", "pro", "team"].includes(tier)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, tier })
    .select()
    .single();

  // Duplicate (email + tier already exists) — treat as success silently
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
