// Lever public JSON API — no auth required
// API: https://api.lever.co/v0/postings/{slug}?mode=json

const LEVER_API = "https://api.lever.co/v0/postings";

export interface LeverJob {
  id: string;
  title: string;
  location: string | null;
  department: string | null;
  team: string | null;
  url: string;
  created_at: number;
}

export function leverSlug(boardUrl: string): string | null {
  const m = boardUrl.match(/jobs\.lever\.co\/([^/?#]+)/);
  return m ? m[1] : null;
}

export async function fetchLeverJobs(boardUrl: string): Promise<LeverJob[]> {
  const slug = leverSlug(boardUrl);
  if (!slug) return [];

  let res: Response;
  try {
    res = await fetch(`${LEVER_API}/${slug}?mode=json`, {
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

  if (!Array.isArray(data)) return [];

  return (data as unknown[]).map((j) => {
    const job = j as Record<string, unknown>;
    const cats = job.categories as Record<string, string> | null | undefined;
    return {
      id: ((job.id as string) ?? "").trim(),
      title: ((job.text as string) ?? "").trim(),
      location: cats?.location ?? null,
      department: cats?.department ?? null,
      team: cats?.team ?? null,
      url: ((job.hostedUrl as string) ?? "").trim(),
      created_at: (job.createdAt as number) ?? 0,
    };
  }).filter((j) => j.title);
}
