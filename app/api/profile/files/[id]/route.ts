/**
 * /api/profile/files/[id]
 *
 * DELETE — remove the file (DB row + Storage object).
 * PATCH  — update metadata: { is_default?: boolean, file_name?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "profile-files";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch row to get storage_path (RLS restricts to owner)
  const { data: row, error: fetchErr } = await supabase
    .from("profile_files")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Delete from Storage (admin client — service role)
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});

  const { error: delErr } = await supabase
    .from("profile_files")
    .delete()
    .eq("id", id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { is_default?: boolean; file_name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const patch: { is_default?: boolean; file_name?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.is_default === "boolean") patch.is_default = body.is_default;
  if (typeof body.file_name === "string" && body.file_name.trim()) {
    patch.file_name = body.file_name.trim().slice(0, 200);
  }

  const { error } = await supabase
    .from("profile_files")
    .update(patch)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
