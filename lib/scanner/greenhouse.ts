// Greenhouse public JSON API — no auth required
// API: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs

const GH_API = "https://boards-api.greenhouse.io/v1/boards";

export interface GHJob {
  id: number;
  title: string;
  location: string | null;
  department: string | null;
  url: string;
  updated_at: string;
}

export function greenhouseSlug(boardUrl: string): string | null {
  const m = boardUrl.match(/boards\.greenhouse\.io\/([^/?#]+)/);
  return m ? m[1] : null;
}

export async function fetchGreenhouseJobs(boardUrl: string): Promise<GHJob[]> {
  const slug = greenhouseSlug(boardUrl);
  if (!slug) return [];

  let res: Response;
  try {
    res = await fetch(`${GH_API}/${slug}/jobs`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json" },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }

  const raw = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(raw)) return [];

  return raw.map((j) => {
    const job = j as Record<string, unknown>;
    const loc = (job.location as { name?: string } | null)?.name ?? null;
    const depts = job.departments as Array<{ name?: string }> | undefined;
    const dept = depts?.[0]?.name ?? null;
    return {
      id: (job.id as number) ?? 0,
      title: ((job.title as string) ?? "").trim(),
      location: loc,
      department: dept,
      url: ((job.absolute_url as string) ?? "").trim(),
      updated_at: ((job.updated_at as string) ?? ""),
    };
  }).filter((j) => j.title);
}
