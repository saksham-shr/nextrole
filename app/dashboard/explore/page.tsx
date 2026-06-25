import { createClient } from "@/lib/supabase/server";
import { ExplorePageContent } from "@/components/nextrole/explore-page";

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's target roles/archetypes for relevance filtering
  const { data: profile } = await supabase
    .from("profiles")
    .select("target_roles, target_archetypes")
    .eq("id", user.id)
    .single();

  const targetRoles: string[] = profile?.target_roles ?? [];
  const targetArchetypes: string[] = profile?.target_archetypes ?? [];

  // Only jobs from the last 10 days, with a description, not the current user's
  const since = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const { data: communityJobs } = await supabase
    .from("jobs")
    .select("title, company, url, description, archetype, user_id, created_at")
    .neq("user_id", user.id)
    .not("description", "is", null)
    .neq("description", "")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);

  // Fetch user's own jobs for duplicate detection
  const { data: myJobs } = await supabase
    .from("jobs")
    .select("title, company")
    .eq("user_id", user.id);

  const myJobSet = new Set(
    (myJobs ?? []).map(
      (j) => `${j.title.toLowerCase()}|||${j.company.toLowerCase()}`,
    ),
  );

  type JobCard = {
    title: string;
    company: string;
    url: string | null;
    description: string;
    archetype: string | null;
    trackers: number;
    alreadyAdded: boolean;
    relevanceScore: number;
  };

  // Deduplicate by (title, company), count trackers, compute relevance
  const seen = new Map<string, JobCard>();
  for (const job of communityJobs ?? []) {
    const key = `${job.title.toLowerCase()}|||${job.company.toLowerCase()}`;
    const existing = seen.get(key);
    if (existing) {
      existing.trackers += 1;
    } else {
      // Relevance: does title match any target role? Does archetype match?
      const titleLower = job.title.toLowerCase();
      const roleMatch = targetRoles.some((r) =>
        titleLower.includes(r.toLowerCase()) ||
        r.toLowerCase().includes(titleLower),
      );
      const archetypeMatch =
        job.archetype &&
        targetArchetypes.some(
          (a) => a.toLowerCase() === job.archetype!.toLowerCase(),
        );
      const relevanceScore = (roleMatch ? 2 : 0) + (archetypeMatch ? 1 : 0);

      seen.set(key, {
        title: job.title,
        company: job.company,
        url: job.url,
        description: job.description ?? "",
        archetype: job.archetype ?? null,
        trackers: 1,
        alreadyAdded: myJobSet.has(key),
        relevanceScore,
      });
    }
  }

  const jobs = Array.from(seen.values()).sort(
    (a, b) => b.relevanceScore - a.relevanceScore || b.trackers - a.trackers,
  );

  return (
    <ExplorePageContent
      jobs={jobs}
      targetRoles={targetRoles}
      targetArchetypes={targetArchetypes}
    />
  );
}
