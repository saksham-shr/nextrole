import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COMPANIES } from "@/lib/scanner/companies";
import { fetchGreenhouseJobs } from "@/lib/scanner/greenhouse";
import { fetchLeverJobs } from "@/lib/scanner/lever";
import type { UserTier } from "@/lib/db/types";

export const maxDuration = 60;

// How many new jobs to add per smart scan, by tier
const TIER_LIMITS: Record<UserTier, number> = {
  free: 10,
  starter: 50,
  pro: 200,
  team: 200,
  byok: 200,
};

// How many smart scans allowed per day (-1 = unlimited)
const DAILY_SCAN_LIMITS: Record<UserTier, number> = {
  free:    1,
  starter: 3,
  pro:     -1,
  team:    -1,
  byok:    -1,
};

interface NormalizedJob {
  title: string;
  company: string;
  url: string;
  location: string | null;
  department: string | null;
}

export interface SmartScanResult {
  fetched: number;
  matched: number;
  added: number;
  duplicates: number;
  limited: boolean;
  daily_limit_reached?: boolean;
  discoveries: Array<{
    id: string;
    title: string;
    company: string;
    url: string;
    location: string | null;
    department: string | null;
    status: "added" | "duplicate";
  }>;
  error?: string;
}

function matchesRoles(job: NormalizedJob, roles: string[]): boolean {
  if (roles.length === 0) return true;
  const haystack = `${job.title} ${job.department ?? ""} ${job.company}`.toLowerCase();
  return roles.some((r) => haystack.includes(r.toLowerCase()));
}

function matchesLocations(job: NormalizedJob, locations: string[]): boolean {
  if (locations.length === 0) return true;
  if (!job.location) return false;
  const loc = job.location.toLowerCase();
  return locations.some((l) => loc.includes(l.toLowerCase()) || l.toLowerCase() === "remote" && loc.includes("remote"));
}

// Fetch with concurrency limit
async function fetchAllJobs(
  companies: typeof COMPANIES,
): Promise<NormalizedJob[]> {
  const CONCURRENCY = 8;
  const results: NormalizedJob[] = [];

  for (let i = 0; i < companies.length; i += CONCURRENCY) {
    const batch = companies.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (c) => {
        if (c.ats === "greenhouse") {
          const jobs = await fetchGreenhouseJobs(c.url);
          return jobs.map((j) => ({
            title: j.title,
            company: c.name,
            url: j.url,
            location: j.location,
            department: j.department,
          }));
        } else if (c.ats === "lever") {
          const jobs = await fetchLeverJobs(c.url);
          return jobs.map((j) => ({
            title: j.title,
            company: c.name,
            url: j.url,
            location: j.location,
            department: j.department ?? j.team,
          }));
        }
        return [];
      }),
    );
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(...r.value);
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load profile for preferences + tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, target_roles, target_locations")
    .eq("id", user.id)
    .single();

  const tier = (profile?.tier ?? "free") as UserTier;
  const targetRoles = (profile?.target_roles as string[] | null) ?? [];
  const targetLocations = (profile?.target_locations as string[] | null) ?? [];
  const jobLimit = TIER_LIMITS[tier];
  const dailyLimit = DAILY_SCAN_LIMITS[tier];

  // Daily scan limit check
  if (dailyLimit !== -1) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("task_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "scan")
      .gte("created_at", startOfDay.toISOString());

    if ((count ?? 0) >= dailyLimit) {
      const upgradeMsg = tier === "free"
        ? "Free plan allows 1 Smart Scan per day — upgrade to Starter for 3/day"
        : "Starter plan allows 3 Smart Scans per day — upgrade to Pro for unlimited";
      return NextResponse.json(
        { error: upgradeMsg, daily_limit_reached: true, limited: true, fetched: 0, matched: 0, added: 0, duplicates: 0, discoveries: [] },
        { status: 429 },
      );
    }
  }

  // Only scan GH + Lever companies (free JSON APIs)
  const scannable = COMPANIES.filter((c) => c.ats === "greenhouse" || c.ats === "lever");

  // Fetch all jobs
  let allJobs: NormalizedJob[];
  try {
    allJobs = await fetchAllJobs(scannable);
  } catch {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 502 });
  }

  // Filter by role + location preferences
  const filtered = allJobs.filter(
    (j) => matchesRoles(j, targetRoles) && matchesLocations(j, targetLocations),
  );

  // Load existing jobs for dedup
  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("url, title, company")
    .eq("user_id", user.id);

  const existingUrls = new Set(
    (existingJobs ?? []).map((j) => j.url?.toLowerCase()).filter(Boolean),
  );
  const existingKeys = new Set(
    (existingJobs ?? []).map((j) => `${j.title?.toLowerCase()}|${j.company?.toLowerCase()}`),
  );

  // Separate dupes from new
  const newJobs: NormalizedJob[] = [];
  const dupeJobs: NormalizedJob[] = [];

  for (const j of filtered) {
    const isDupe =
      (j.url && existingUrls.has(j.url.toLowerCase())) ||
      existingKeys.has(`${j.title.toLowerCase()}|${j.company.toLowerCase()}`);
    if (isDupe) {
      dupeJobs.push(j);
    } else {
      newJobs.push(j);
    }
  }

  const limited = newJobs.length > jobLimit;
  const toAdd = newJobs.slice(0, jobLimit);

  // Insert new jobs
  const discoveries: SmartScanResult["discoveries"] = [];

  for (const j of toAdd) {
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title: j.title,
        company: j.company,
        url: j.url || null,
        description: j.department ? `Department: ${j.department}` : null,
        source: "Smart Scan",
        status: "pending",
      })
      .select("id")
      .single();

    if (job) {
      existingUrls.add((j.url ?? "").toLowerCase());
      existingKeys.add(`${j.title.toLowerCase()}|${j.company.toLowerCase()}`);
      discoveries.push({
        id: job.id,
        title: j.title,
        company: j.company,
        url: j.url,
        location: j.location,
        department: j.department,
        status: "added",
      });
    }
  }

  // Add a few dupes to the response for display (capped at 20)
  for (const j of dupeJobs.slice(0, 20)) {
    discoveries.push({
      id: `dup_${j.url ?? j.title}`,
      title: j.title,
      company: j.company,
      url: j.url,
      location: j.location,
      department: j.department,
      status: "duplicate",
    });
  }

  // Log activity
  await supabase.from("task_runs").insert({
    user_id: user.id,
    type: "scan",
    status: "completed",
    input: { type: "smart_scan", target_roles: targetRoles, target_locations: targetLocations },
    output: { fetched: allJobs.length, matched: filtered.length, added: toAdd.length, duplicates: dupeJobs.length },
  });

  return NextResponse.json({
    fetched: allJobs.length,
    matched: filtered.length,
    added: toAdd.length,
    duplicates: dupeJobs.length,
    limited,
    discoveries,
  } satisfies SmartScanResult);
}
