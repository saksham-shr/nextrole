import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { SCANNER_SYSTEM_PROMPT, buildScannerPrompt } from "@/lib/scanner/prompt";

export const maxDuration = 60;

interface RawDiscovery {
  title?: unknown;
  company?: unknown;
  url?: unknown;
  location?: unknown;
  department?: unknown;
  description_snippet?: unknown;
}

export interface ScanResult {
  scan_run_id: string;
  source_id: string;
  discovered: number;
  added: number;
  duplicates: number;
  discoveries: Array<{
    id: string;
    title: string;
    company: string;
    url: string | null;
    location: string | null;
    department: string | null;
    status: "added" | "duplicate";
  }>;
  error?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { source_id?: string };
  const sourceId = body.source_id;
  if (!sourceId) return NextResponse.json({ error: "source_id required" }, { status: 400 });

  // Load source
  const { data: source } = await supabase
    .from("scan_sources")
    .select("*")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .single();
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  // Load active provider
  const { data: providers } = await supabase
    .from("provider_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false })
    .limit(1);

  const cred = providers?.[0];
  if (!cred?.encrypted_key)
    return NextResponse.json(
      { error: "No AI provider configured — add a key in Providers" },
      { status: 400 },
    );

  // Create scan_run
  const { data: scanRun } = await supabase
    .from("scan_runs")
    .insert({ user_id: user.id, source_id: sourceId, status: "running" })
    .select("id")
    .single();

  if (!scanRun) return NextResponse.json({ error: "Could not create scan run" }, { status: 500 });

  // Fetch the career page
  let html: string;
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JobScanner/1.0; +https://nextrole.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    await supabase
      .from("scan_runs")
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", scanRun.id);
    return NextResponse.json({ error: `Could not fetch source URL: ${message}` }, { status: 502 });
  }

  // Call AI to extract listings
  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");
  const userPrompt = buildScannerPrompt(html, source.url);

  let rawDiscoveries: RawDiscovery[];
  try {
    const rawOutput =
      await callProvider(cred.provider, apiKey, model, SCANNER_SYSTEM_PROMPT, userPrompt);
    const parsed = parseJSON(rawOutput);
    rawDiscoveries = Array.isArray(parsed) ? (parsed as RawDiscovery[]) : [];
  } catch {
    await supabase
      .from("scan_runs")
      .update({
        status: "failed",
        error: "AI returned invalid JSON",
        updated_at: new Date().toISOString(),
      })
      .eq("id", scanRun.id);
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  if (rawDiscoveries.length === 0) {
    await supabase
      .from("scan_runs")
      .update({
        status: "completed",
        discovered_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scanRun.id);
    return NextResponse.json({
      scan_run_id: scanRun.id,
      source_id: sourceId,
      discovered: 0,
      added: 0,
      duplicates: 0,
      discoveries: [],
    } satisfies ScanResult);
  }

  // Load existing jobs to dedup
  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("id, title, company, url")
    .eq("user_id", user.id);

  const existingUrls = new Set(
    (existingJobs ?? []).map((j) => j.url?.toLowerCase()).filter(Boolean),
  );
  const existingTitlesCompanies = new Set(
    (existingJobs ?? []).map((j) =>
      `${j.title.toLowerCase()}|${j.company.toLowerCase()}`,
    ),
  );

  // Process discoveries
  const results: ScanResult["discoveries"] = [];
  let addedCount = 0;
  let dupCount = 0;

  for (const raw of rawDiscoveries.slice(0, 50)) {
    const title = str(raw.title);
    const company = str(raw.company) || source.name;
    const url = str(raw.url) || null;
    const location = str(raw.location) || null;
    const department = str(raw.department) || null;
    const descSnippet = str(raw.description_snippet) || null;

    if (!title) continue;

    // Dedup check
    const isDupe =
      (url && existingUrls.has(url.toLowerCase())) ||
      existingTitlesCompanies.has(`${title.toLowerCase()}|${company.toLowerCase()}`);

    if (isDupe) {
      // Record as duplicate discovery but don't add to jobs
      const { data: disc } = await supabase
        .from("scan_discoveries")
        .insert({
          user_id: user.id,
          scan_run_id: scanRun.id,
          source_id: sourceId,
          title,
          company,
          url,
          location,
          department,
          description_snippet: descSnippet,
          status: "duplicate",
        })
        .select("id")
        .single();

      dupCount++;
      if (disc) {
        results.push({ id: disc.id, title, company, url, location, department, status: "duplicate" });
      }
      continue;
    }

    // Add to jobs pipeline
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title,
        company,
        url,
        source: source.name,
        status: "pending",
      })
      .select("id")
      .single();

    const { data: disc } = await supabase
      .from("scan_discoveries")
      .insert({
        user_id: user.id,
        scan_run_id: scanRun.id,
        source_id: sourceId,
        job_id: job?.id ?? null,
        title,
        company,
        url,
        location,
        department,
        description_snippet: descSnippet,
        status: "added",
      })
      .select("id")
      .single();

    addedCount++;
    if (url) existingUrls.add(url.toLowerCase());
    existingTitlesCompanies.add(`${title.toLowerCase()}|${company.toLowerCase()}`);

    if (disc) {
      results.push({ id: disc.id, title, company, url, location, department, status: "added" });
    }
  }

  const discoveredCount = addedCount + dupCount;

  // Finalize scan_run
  await supabase
    .from("scan_runs")
    .update({
      status: "completed",
      discovered_count: discoveredCount,
      added_count: addedCount,
      duplicate_count: dupCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scanRun.id);

  // Update source stats
  await supabase
    .from("scan_sources")
    .update({
      last_scanned_at: new Date().toISOString(),
      total_discovered: source.total_discovered + addedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  // Log to activity
  await supabase.from("task_runs").insert({
    user_id: user.id,
    type: "scan",
    status: "completed",
    input: { source_id: sourceId, source_name: source.name },
    output: { discovered: discoveredCount, added: addedCount, duplicates: dupCount },
  });

  await supabase
    .from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  return NextResponse.json({
    scan_run_id: scanRun.id,
    source_id: sourceId,
    discovered: discoveredCount,
    added: addedCount,
    duplicates: dupCount,
    discoveries: results,
  } satisfies ScanResult);
}
