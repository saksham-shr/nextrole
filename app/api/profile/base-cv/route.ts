/**
 * POST /api/profile/base-cv
 *
 * Accepts a resume file (PDF / DOCX, ≤5 MB), extracts plain text, and
 * saves it to profiles.base_cv for the authenticated user.
 *
 * Legacy .doc (application/msword) is intentionally not accepted: mammoth
 * only parses OOXML (.docx), and the previous "doc supported" claim
 * silently produced junk text on real .doc uploads.
 *
 * Returns: { words: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF or DOCX (legacy .doc not supported)." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (mime === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text ?? "";
    } else {
      // DOCX only — mammoth does not handle the legacy .doc binary format.
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    }
  } catch (err) {
    console.error("[base-cv] extraction error", err);
    return NextResponse.json({ error: "Could not extract text from file." }, { status: 422 });
  }

  // Normalise whitespace
  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();

  if (!text) {
    return NextResponse.json({ error: "No readable text found in file. Try a text-based PDF." }, { status: 422 });
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ base_cv: text, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (dbError) {
    console.error("[profile/base-cv] DB write failed:", dbError.message);
    return NextResponse.json({ error: "Could not save CV" }, { status: 500 });
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  return NextResponse.json({ words });
}
