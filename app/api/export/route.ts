import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ExportType = "jobs" | "evaluations" | "reports";
type ExportFormat = "csv" | "json";

// ── CSV helpers ──────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ];
  return lines.join("\n");
}

// ── Data fetchers ────────────────────────────────────────────

async function fetchJobs(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("jobs")
    .select("id, title, company, url, status, archetype, source, notes, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Record<string, unknown>[];
}

async function fetchEvaluations(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("evaluations")
    .select(`
      id,
      job_id,
      score,
      decision,
      provider,
      model,
      created_at,
      jobs ( title, company )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as Array<{
    id: string;
    job_id: string;
    score: number | null;
    decision: string | null;
    provider: string | null;
    model: string | null;
    created_at: string;
    jobs: { title: string; company: string } | null;
  }>).map((row) => ({
    id: row.id,
    job_id: row.job_id,
    job_title: row.jobs?.title ?? "",
    job_company: row.jobs?.company ?? "",
    score: row.score,
    decision: row.decision,
    provider: row.provider,
    model: row.model,
    created_at: row.created_at,
  })) as Record<string, unknown>[];
}

async function fetchReports(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("reports")
    .select(`
      id,
      job_id,
      evaluation_id,
      title,
      type,
      created_at,
      jobs ( title, company )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as Array<{
    id: string;
    job_id: string | null;
    evaluation_id: string | null;
    title: string;
    type: string;
    created_at: string;
    jobs: { title: string; company: string } | null;
  }>).map((row) => ({
    id: row.id,
    job_id: row.job_id,
    evaluation_id: row.evaluation_id,
    title: row.title,
    type: row.type,
    job_title: row.jobs?.title ?? "",
    job_company: row.jobs?.company ?? "",
    created_at: row.created_at,
  })) as Record<string, unknown>[];
}

// ── Route handler ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "json") as ExportFormat;
  const type = (searchParams.get("type") ?? "jobs") as ExportType;

  if (!["csv", "json"].includes(format)) {
    return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
  }
  if (!["jobs", "evaluations", "reports"].includes(type)) {
    return NextResponse.json({ error: "type must be jobs, evaluations, or reports" }, { status: 400 });
  }

  let rows: Record<string, unknown>[];
  if (type === "jobs") rows = await fetchJobs(supabase, user.id);
  else if (type === "evaluations") rows = await fetchEvaluations(supabase, user.id);
  else rows = await fetchReports(supabase, user.id);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `nextrole-${type}-${timestamp}.${format}`;

  if (format === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV
  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
