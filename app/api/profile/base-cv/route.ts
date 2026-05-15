/**
 * POST /api/profile/base-cv
 *
 * Accepts a resume file (PDF / DOC / DOCX, ≤5 MB), extracts plain text,
 * and saves it to profiles.base_cv for the authenticated user.
 *
 * Returns: { words: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Unsupported file type. Use PDF, DOC or DOCX." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (mime === "application/pdf") {
      const pdfMod = await import("pdf-parse");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = ((pdfMod as any).default ?? pdfMod) as (buf: Buffer) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      text = result.text ?? "";
    } else {
      // DOC / DOCX
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
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  return NextResponse.json({ words });
}
