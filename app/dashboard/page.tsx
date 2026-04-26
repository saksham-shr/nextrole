import { createClient } from "@/lib/supabase/server";
import { DashboardHome } from "@/components/nextrole/dashboard-home";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // All queries in parallel
  const [
    { data: profile },
    { data: providerRows },
    { data: jobs },
    { data: recentRuns },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, base_cv").eq("id", user.id).single(),
    supabase
      .from("provider_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("provider", ["anthropic", "openai"])
      .limit(1),
    supabase
      .from("jobs")
      .select(`id, title, company, status, archetype, evaluations(score, decision)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("task_runs")
      .select("id, type, status, progress_message, error, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const allJobs = jobs ?? [];

  // KPI counts
  const activeStatuses = ["evaluated", "applied", "interview", "offer"] as const;
  const activeJobs = allJobs.filter((j) => activeStatuses.includes(j.status as typeof activeStatuses[number]));
  const interviews = allJobs.filter((j) => j.status === "interview");
  const offers = allJobs.filter((j) => j.status === "offer");
  const highScore = allJobs.filter(
    (j) =>
      j.status === "evaluated" &&
      (j.evaluations as Array<{ score: number | null }>).some(
        (e) => e.score !== null && e.score >= 4.0,
      ),
  );
  const pending = allJobs.filter((j) => j.status === "pending");

  // Pipeline kanban data (non-archived)
  const kanbanStatuses = ["evaluated", "applied", "interview", "offer"] as const;
  const kanban = kanbanStatuses.map((status) => ({
    title: status.charAt(0).toUpperCase() + status.slice(1),
    items: allJobs
      .filter((j) => j.status === status)
      .slice(0, 5)
      .map((j) => `${j.title} — ${j.company}`),
  }));

  // Attention items
  const attentionItems: Array<{ title: string; body: string; href: string; tone: "warn" | "default" }> = [];
  if (!profile?.base_cv) {
    attentionItems.push({
      title: "CV missing",
      body: "Add your base CV in Settings — the evaluator reads it for every analysis.",
      href: "/dashboard/settings",
      tone: "warn",
    });
  }
  if (!providerRows?.length) {
    attentionItems.push({
      title: "No AI provider configured",
      body: "Add an Anthropic or OpenAI API key in Providers to run evaluations.",
      href: "/dashboard/providers",
      tone: "warn",
    });
  }
  if (highScore.length > 0) {
    attentionItems.push({
      title: `${highScore.length} high-score ${highScore.length === 1 ? "role" : "roles"} not applied`,
      body: "Roles scored ≥ 4.0 are waiting — move them forward in the tracker.",
      href: "/dashboard/tracker",
      tone: "default",
    });
  }
  if (pending.length > 0) {
    attentionItems.push({
      title: `${pending.length} ${pending.length === 1 ? "role" : "roles"} pending triage`,
      body: "Jobs waiting in the pipeline — evaluate or remove them.",
      href: "/dashboard/pipeline",
      tone: "default",
    });
  }
  const failedRuns = (recentRuns ?? []).filter((r) => r.status === "failed");
  if (failedRuns.length > 0) {
    attentionItems.push({
      title: `${failedRuns.length} failed task ${failedRuns.length === 1 ? "run" : "runs"}`,
      body: "Check the activity log to diagnose and retry.",
      href: "/dashboard/activity",
      tone: "warn",
    });
  }

  return (
    <DashboardHome
      userName={profile?.full_name ?? user.email?.split("@")[0] ?? "there"}
      hasCV={Boolean(profile?.base_cv)}
      hasProvider={Boolean(providerRows?.length)}
      kpis={{
        active: activeJobs.length,
        interviews: interviews.length,
        offers: offers.length,
        highScore: highScore.length,
        pending: pending.length,
      }}
      attentionItems={attentionItems}
      kanban={kanban}
      recentRuns={recentRuns ?? []}
    />
  );
}
