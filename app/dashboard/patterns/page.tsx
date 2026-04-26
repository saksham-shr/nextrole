import { createClient } from "@/lib/supabase/server";
import { PatternsPageContent } from "@/components/nextrole/patterns-page";

type ArchetypeStat = { archetype: string; count: number; avg_score: number | null; applied: number };
type SourceStat = { source: string; count: number };

export default async function PatternsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: jobs }, { data: evals }] = await Promise.all([
    supabase.from("jobs").select("status, archetype, source, created_at").eq("user_id", user.id),
    supabase.from("evaluations").select("score, job_id").eq("user_id", user.id),
  ]);

  const allJobs = jobs ?? [];
  const allEvals = evals ?? [];

  // Funnel
  const statusOrder = ["pending", "evaluated", "applied", "interview", "offer"];
  const funnel = statusOrder.map((s) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    count: allJobs.filter((j) => j.status === s).length,
  }));

  // Avg score
  const scores = allEvals.map((e) => e.score).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const totalEvaluated = allJobs.filter((j) => j.status !== "pending").length;

  // Eval → apply conversion
  const evaluated = allJobs.filter((j) => j.status !== "pending").length;
  const applied = allJobs.filter((j) =>
    ["applied", "interview", "offer"].includes(j.status),
  ).length;
  const conversionRate = evaluated > 0 ? (applied / evaluated) * 100 : null;

  // Archetype breakdown
  const archetypeMap = new Map<string, ArchetypeStat>();
  for (const job of allJobs) {
    const key = job.archetype ?? "Unknown";
    const existing = archetypeMap.get(key) ?? { archetype: key, count: 0, avg_score: null, applied: 0 };
    existing.count++;
    if (["applied", "interview", "offer"].includes(job.status)) existing.applied++;
    archetypeMap.set(key, existing);
  }
  // Attach eval scores to archetypes
  const jobEvalMap = new Map<string, number[]>();
  for (const job of allJobs) {
    if (!job.archetype) continue;
    const jobEvalsForJob = allEvals.filter((e) => {
      // We don't have job_id in jobs query directly — handled below
      return false;
    });
    void jobEvalsForJob;
  }
  // Simpler approach: join by job_id client-side
  const jobsById = new Map(allJobs.map((j, i) => {
    // We need IDs — re-query
    return [i, j]; // placeholder
  }));
  void jobsById;

  // Re-fetch jobs with IDs for proper archetype score join
  const { data: jobsWithId } = await supabase
    .from("jobs")
    .select("id, archetype, status, source")
    .eq("user_id", user.id);

  const archetypeScores = new Map<string, number[]>();
  for (const job of jobsWithId ?? []) {
    if (!job.archetype) continue;
    const jobScores = allEvals
      .filter((e) => e.job_id === job.id)
      .map((e) => e.score)
      .filter((s): s is number => s !== null);
    const existing = archetypeScores.get(job.archetype) ?? [];
    archetypeScores.set(job.archetype, [...existing, ...jobScores]);
  }

  const archetypeStats: ArchetypeStat[] = Array.from(archetypeMap.values())
    .map((a) => {
      const sc = archetypeScores.get(a.archetype) ?? [];
      return {
        ...a,
        avg_score: sc.length > 0 ? sc.reduce((x, y) => x + y, 0) / sc.length : null,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Source breakdown
  const sourceMap = new Map<string, number>();
  for (const job of allJobs) {
    const key = job.source ?? "unknown";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const sourceStats: SourceStat[] = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Recommendations
  const recommendations: Array<{ title: string; body: string }> = [];

  if (archetypeStats.length >= 2) {
    const best = archetypeStats.find((a) => a.avg_score !== null);
    const worst = [...archetypeStats].reverse().find((a) => a.avg_score !== null);
    if (best && worst && best.archetype !== worst.archetype) {
      recommendations.push({
        title: `Focus on ${best.archetype} roles`,
        body: `Your ${best.archetype} evaluations score highest (avg ${best.avg_score?.toFixed(1)}). Prioritise sourcing more of these.`,
      });
    }
  }

  if (conversionRate !== null && conversionRate < 30 && evaluated >= 5) {
    recommendations.push({
      title: "Low eval-to-apply rate",
      body: `Only ${Math.round(conversionRate)}% of evaluated roles are being applied to. Consider raising the bar earlier in triage, or applying to more of your high-score roles.`,
    });
  }

  const highScoreUnapplied = (jobsWithId ?? []).filter((j) => {
    const sc = allEvals.filter((e) => e.job_id === j.id).map((e) => e.score).filter((s): s is number => s !== null);
    return j.status === "evaluated" && sc.some((s) => s >= 4.0);
  });
  if (highScoreUnapplied.length > 0) {
    recommendations.push({
      title: `${highScoreUnapplied.length} high-score role${highScoreUnapplied.length > 1 ? "s" : ""} not yet applied`,
      body: "Roles scoring ≥ 4.0 are strong candidates. Move them forward in the tracker.",
    });
  }

  if (recommendations.length === 0 && totalEvaluated > 0) {
    recommendations.push({
      title: "Looking good",
      body: "Your pipeline looks healthy. Keep evaluating and applying consistently.",
    });
  }

  return (
    <PatternsPageContent
      funnel={funnel}
      archetypeStats={archetypeStats}
      sourceStats={sourceStats}
      avgScore={avgScore}
      totalEvaluated={totalEvaluated}
      conversionRate={conversionRate}
      recommendations={recommendations}
    />
  );
}
