/**
 * /api/profile/files
 *
 * GET    — list the current user's uploaded resume + cover-letter files.
 * POST   — upload a new file (multipart/form-data).
 *           fields: file (File), kind ("resume" | "cover_letter"), is_default? ("true")
 *
 * Files live in Supabase Storage bucket `profile-files` under
 *   <user_id>/<uuid>-<filename>
 * RLS on the bucket restricts access to the owning user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "profile-files";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function safeName(name: string): string {
  return name
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 120);
}

// ── GET — list files ─────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profile_files")
    .select("id, kind, file_name, file_size, mime_type, is_default, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ files: data ?? [] });
}

// ── POST — upload file ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  const kindRaw = form.get("kind");
  const isDefault = form.get("is_default") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (kindRaw !== "resume" && kindRaw !== "cover_letter") {
    return NextResponse.json({ error: "kind must be 'resume' or 'cover_letter'" }, { status: 400 });
  }
  const kind = kindRaw as "resume" | "cover_letter";

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({
      error: `Unsupported file type: ${file.type}. Allowed: PDF, DOC, DOCX, TXT.`,
    }, { status: 415 });
  }

  // ── Upload to Storage via admin client (service role bypasses RLS,
  //    we manually scope path to user.id which keeps isolation correct).
  const admin = createAdminClient();
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 500 });
  }

  // ── Record metadata row (RLS validates user_id)
  const { data: row, error: insErr } = await supabase
    .from("profile_files")
    .insert({
      user_id:      user.id,
      kind,
      file_name:    file.name.slice(0, 200),
      storage_path: storagePath,
      file_size:    file.size,
      mime_type:    file.type || null,
      is_default:   isDefault,
    })
    .select("id, kind, file_name, file_size, mime_type, is_default, created_at")
    .single();

  if (insErr) {
    // Best-effort rollback of the uploaded blob
    await admin.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    return NextResponse.json({ error: `DB insert failed: ${insErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ file: row });
}
