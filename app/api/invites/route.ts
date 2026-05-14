import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

async function requireAdmin(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && (user.email ?? "").toLowerCase() === ADMIN_EMAIL;
}

// GET /api/invites — list all invites
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: data });
}

// POST /api/invites — create invite(s)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { emails?: string[]; email?: string; tier?: string };
  const tier = body.tier ?? "pro";
  const rawEmails = body.emails ?? (body.email ? [body.email] : []);
  const emails = rawEmails
    .map((e: string) => e.trim().toLowerCase())
    .filter((e: string) => e.includes("@"));

  if (!emails.length) {
    return NextResponse.json({ error: "No valid emails provided" }, { status: 400 });
  }

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Check which emails are already invited and skip them
  const { data: existing } = await admin
    .from("invites")
    .select("email")
    .in("email", emails);

  const existingSet = new Set((existing ?? []).map((r: { email: string }) => r.email.toLowerCase()));
  const newEmails = emails.filter((e: string) => !existingSet.has(e));

  let created = 0;
  if (newEmails.length > 0) {
    const rows = newEmails.map((email: string) => ({
      email,
      tier,
      expires_at: expiresAt,
      invited_by: ADMIN_EMAIL,
    }));

    const { data, error } = await admin
      .from("invites")
      .insert(rows)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    created = data?.length ?? 0;
  }

  return NextResponse.json({ created, skipped: existingSet.size });
}

// DELETE /api/invites — remove an invite by email
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("invites").delete().ilike("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
