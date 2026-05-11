/**
 * GET /api/extension/profile-file?kind=resume|cover_letter[&id=<file_id>]
 * Auth: Bearer <extension_token>
 *
 * Returns the file BYTES (binary) for the user's default file of the given kind,
 * or a specific file by id. Used by the extension service worker to fetch the
 * blob and inject it into the job form's <input type="file">.
 *
 * We stream the bytes directly rather than returning a signed URL because:
 *   • the extension can't always set credentials on cross-origin URLs
 *   • we keep auth on the API edge (bearer token) instead of a public URL
 *   • size is small (≤5 MB) so streaming is fine
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

const BUCKET = "profile-files";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-profile-file:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const kind = req.nextUrl.searchParams.get("kind") ?? "resume";
  const id   = req.nextUrl.searchParams.get("id");

  if (kind !== "resume" && kind !== "cover_letter") {
    return NextResponse.json({ error: "kind must be 'resume' or 'cover_letter'" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Lookup metadata
  let query = admin
    .from("profile_files")
    .select("id, kind, file_name, storage_path, mime_type")
    .eq("user_id", userId)
    .eq("kind", kind);

  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("is_default", true);
  }

  const { data: row, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!row) {
    // Fall back to most recent if no default set
    if (!id) {
      const { data: fallback } = await admin
        .from("profile_files")
        .select("id, kind, file_name, storage_path, mime_type")
        .eq("user_id", userId)
        .eq("kind", kind)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!fallback) {
        return NextResponse.json({ error: `No ${kind} uploaded yet` }, { status: 404 });
      }
      return downloadAndReturn(admin, fallback);
    }
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return downloadAndReturn(admin, row);
}

async function downloadAndReturn(
  admin: ReturnType<typeof createAdminClient>,
  row: { file_name: string; storage_path: string; mime_type: string | null },
) {
  const { data: blob, error } = await admin.storage
    .from(BUCKET)
    .download(row.storage_path);

  if (error || !blob) {
    return NextResponse.json({ error: `Storage download failed: ${error?.message ?? "unknown"}` }, { status: 500 });
  }

  const arrayBuffer = await blob.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type":        row.mime_type ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(row.file_name)}"`,
      "Content-Length":      String(arrayBuffer.byteLength),
      "X-File-Name":         row.file_name,
      "Cache-Control":       "private, no-store",
    },
  });
}
