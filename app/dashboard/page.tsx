import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHome } from "@/components/nextrole/dashboard-home";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // All queries in parallel
  const [
    { data: profile },
    { data: jobs },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, base_cv, tier, daily_credits, topup_credits").eq("id", user.id).single(),
    supabase
      .from("jobs")
      .select(`id, title, company, status, archetype, evaluations(score, decision)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
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

  // Top jobs for "Worth a look" — scored, sorted by score desc
  const topJobs = allJobs
    .map((j) => {
      const evals = j.evaluations as Array<{ score: number | null }>;
      const score = evals[0]?.score ?? null;
      return { id: j.id, title: j.title, company: j.company, status: j.status, score };
    })
    .filter((j) => j.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 4);

  // Attention items
  const attentionItems: Array<{ title: string; body: string; href: string; tone: "warn" | "default" }> = [];
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

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const tier = isAdmin ? "pro" : ((profile?.tier as "free" | "starter" | "pro") ?? "free");
  const creditsRemaining = isAdmin
    ? 300
    : (profile?.daily_credits ?? 0) + (profile?.topup_credits ?? 0);

  return (
    <DashboardHome
      userName={profile?.full_name ?? user.email?.split("@")[0] ?? "there"}
      hasCV={Boolean(profile?.base_cv)}
      hasProvider={Boolean(
        process.env.OPENROUTER_API_KEY?.trim() ||
        process.env.ANTHROPIC_API_KEY?.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        process.env.GEMINI_API_KEY?.trim()
      )}
      hasJobs={allJobs.length > 0}
      tier={tier}
      creditsRemaining={creditsRemaining}
      kpis={{
        active: activeJobs.length,
        interviews: interviews.length,
        offers: offers.length,
        highScore: highScore.length,
        pending: pending.length,
      }}
      attentionItems={attentionItems}
      topJobs={topJobs}
    />
  );
}
