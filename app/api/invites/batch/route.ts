import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

async function getAdminActor(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (user.email ?? "").toLowerCase() !== ADMIN_EMAIL) return null;
  return { id: user.id, email: user.email ?? "" };
}

// DELETE /api/invites/batch — delete multiple invites by email, skipping used ones
export async function DELETE(req: NextRequest) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { emails?: string[] };
  const emails = (body.emails ?? [])
    .map((e: string) => e.trim().toLowerCase())
    .filter((e: string) => e.includes("@"));

  if (!emails.length) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch rows to check which are already used
  const { data: rows, error: fetchError } = await admin
    .from("invites")
    .select("email, used_at")
    .in("email", emails);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const deletableEmails = (rows ?? [])
    .filter((r: { email: string; used_at: string | null }) => !r.used_at)
    .map((r: { email: string; used_at: string | null }) => r.email);

  const skipped = emails.length - deletableEmails.length;

  if (deletableEmails.length === 0) {
    return NextResponse.json({ deleted: 0, skipped });
  }

  const { error } = await admin.from("invites").delete().in("email", deletableEmails);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId:    actor.id,
    actorEmail: actor.email,
    action:     "invite_batch_delete",
    targetType: "invite",
    targetId:   deletableEmails.join(","),
    before:     { emails: deletableEmails },
    after:      null,
    metadata:   { deleted: deletableEmails.length, skipped },
  });

  return NextResponse.json({ deleted: deletableEmails.length, skipped });
}
