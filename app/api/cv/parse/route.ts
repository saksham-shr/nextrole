import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = (file as File).name ?? "";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";

    if (ext === "md" || ext === "txt") {
      text = buffer.toString("utf-8");
    } else if (ext === "pdf") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = await import("pdf-parse");
      const parse = (pdfParse as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ?? pdfParse;
      const result = await (parse as (b: Buffer) => Promise<{ text: string }>)(buffer);
      text = result.text;
    } else if (ext === "docx") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    // Normalise: collapse 3+ consecutive blank lines to 2
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[cv/parse]", err);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
