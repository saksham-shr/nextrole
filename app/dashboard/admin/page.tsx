import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";
import { Badge, StatCard, Surface } from "@/components/nextrole/ui";
import { AdminDeleteButton } from "@/components/nextrole/admin-delete-button";
import { AdminInvites } from "@/components/nextrole/admin-invites";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function MiniBar({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "ok" | "warn" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = {
    accent: "var(--accent)",
    ok: "var(--ok)",
    warn: "var(--warn)",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[tone] }} />
      </div>
      <span className="w-8 text-right font-mono text-[11px] text-[var(--muted-foreground)]">{value}</span>
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const email = (user?.email ?? "").toLowerCase();
  if (!user || email !== ADMIN_EMAIL) redirect("/dashboard");

  const { tab = "overview" } = await searchParams;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const canUseAdmin = Boolean(url && serviceRoleKey);

  let metrics = {
    totalUsers: 0, totalJobs: 0, totalEvaluations: 0,
    totalResumes: 0, totalTaskRuns: 0, activeTrialUsers: 0,
    usersSignedInAtLeastOnce: 0, failedTaskRuns: 0,
    freeUsers: 0, starterUsers: 0, proUsers: 0,
  };

  let recentUsers: Array<{
    id: string; email: string; createdAt: string;
    lastSignInAt: string | null; trialDaysLeft: number; tier: string;
  }> = [];

  let recentTaskRuns: Array<{
    id: string; user_id: string; type: string;
    status: string; created_at: string; error: string | null;
  }> = [];

  let invites: import("@/lib/db/types").InviteRow[] = [];

  if (canUseAdmin && url && serviceRoleKey) {
    const admin = createAdminClient();
    const adminAuth = createSupabaseClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [
      usersResult, jobsResult, evaluationsResult, resumesResult,
      taskRunsResult, profilesResult, failedTasksResult,
      recentTaskRunsResult, invitesResult,
    ] = await Promise.all([
      adminAuth.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("jobs").select("*", { count: "exact", head: true }),
      admin.from("evaluations").select("*", { count: "exact", head: true }),
      admin.from("resumes").select("*", { count: "exact", head: true }),
      admin.from("task_runs").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("tier", { count: "exact" }),
      admin.from("task_runs").select("*", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("task_runs").select("id,user_id,type,status,created_at,error").order("created_at", { ascending: false }).limit(20),
      admin.from("invites").select("*").order("created_at", { ascending: false }),
    ]);

    const users = (usersResult.data?.users ?? []).slice().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const NOW_MS = Date.now();
    const withTrialInfo = users.map((account) => {
      const created = new Date(account.created_at).getTime();
      const diffDays = Math.floor((NOW_MS - created) / 86400000);
      return {
        id: account.id,
        email: account.email ?? "Unknown",
        createdAt: account.created_at,
        lastSignInAt: account.last_sign_in_at ?? null,
        trialDaysLeft: Math.max(0, 14 - diffDays),
        tier: "free",
      };
    });

    // Tier breakdown from profiles
    const profileRows = profilesResult.data ?? [];
    const freeUsers = profileRows.filter((p: { tier: string }) => p.tier === "free").length;
    const starterUsers = profileRows.filter((p: { tier: string }) => p.tier === "starter").length;
    const proUsers = profileRows.filter((p: { tier: string }) => p.tier === "pro").length;

    metrics = {
      totalUsers: profilesResult.count ?? users.length,
      totalJobs: jobsResult.count ?? 0,
      totalEvaluations: evaluationsResult.count ?? 0,
      totalResumes: resumesResult.count ?? 0,
      totalTaskRuns: taskRunsResult.count ?? 0,
      activeTrialUsers: withTrialInfo.filter((a) => a.trialDaysLeft > 0).length,
      usersSignedInAtLeastOnce: withTrialInfo.filter((a) => a.lastSignInAt).length,
      failedTaskRuns: failedTasksResult.count ?? 0,
      freeUsers,
      starterUsers,
      proUsers,
    };

    recentUsers = withTrialInfo.slice(0, 20);
    recentTaskRuns = (recentTaskRunsResult.data ?? []) as typeof recentTaskRuns;
    invites = (invitesResult.data ?? []) as import("@/lib/db/types").InviteRow[];
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "invites", label: `Invites (${invites.length})` },
    { id: "activity", label: "Activity" },
  ];

  const tabLinkClass = (id: string) =>
    `rounded-[6px] px-3.5 py-2 text-[13px] font-medium transition ${
      tab === id
        ? "bg-[var(--surface)] border border-[var(--line-soft)] text-[var(--foreground)]"
        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Admin panel
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Workspace metrics</h1>
        </div>
        <Badge tone="accent">Admins only</Badge>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--line-soft)] pb-0">
        {tabs.map(({ id, label }) => (
          <a key={id} href={`?tab=${id}`} className={tabLinkClass(id)}>
            {label}
          </a>
        ))}
      </div>

      {!canUseAdmin && (
        <Surface tone="warn" className="p-5">
          <h2 className="text-lg font-bold">Service role key required</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code> to unlock all admin metrics.
          </p>
        </Surface>
      )}

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={String(metrics.totalUsers)} sublabel="profiles in system" tone="accent" />
            <StatCard label="Signed in" value={String(metrics.usersSignedInAtLeastOnce)} sublabel="users with login activity" />
            <StatCard label="Trial active" value={String(metrics.activeTrialUsers)} sublabel="within 14-day trial" tone="ok" />
            <StatCard label="Invites sent" value={String(invites.length)} sublabel={`${invites.filter((i) => !!i.used_at).length} used`} />
            <StatCard label="Jobs" value={String(metrics.totalJobs)} sublabel="tracked across all users" />
            <StatCard label="Evaluations" value={String(metrics.totalEvaluations)} sublabel="completed AI analyses" />
            <StatCard label="Resumes" value={String(metrics.totalResumes)} sublabel="generated records" />
            <StatCard label="Task runs" value={String(metrics.totalTaskRuns)} sublabel={`${metrics.failedTaskRuns} failed`} tone={metrics.failedTaskRuns > 0 ? "warn" : undefined} />
          </div>

          {/* Tier distribution */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Surface className="p-5">
              <h2 className="text-[15px] font-semibold">Tier distribution</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
                    <span>Free</span>
                    <span>{metrics.totalUsers > 0 ? Math.round((metrics.freeUsers / metrics.totalUsers) * 100) : 0}%</span>
                  </div>
                  <MiniBar value={metrics.freeUsers} max={metrics.totalUsers} tone="warn" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
                    <span>Starter</span>
                    <span>{metrics.totalUsers > 0 ? Math.round((metrics.starterUsers / metrics.totalUsers) * 100) : 0}%</span>
                  </div>
                  <MiniBar value={metrics.starterUsers} max={metrics.totalUsers} tone="accent" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
                    <span>Pro</span>
                    <span>{metrics.totalUsers > 0 ? Math.round((metrics.proUsers / metrics.totalUsers) * 100) : 0}%</span>
                  </div>
                  <MiniBar value={metrics.proUsers} max={metrics.totalUsers} tone="ok" />
                </div>
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="text-[15px] font-semibold">Usage overview</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
                    <span>Jobs tracked</span>
                  </div>
                  <MiniBar value={metrics.totalJobs} max={Math.max(metrics.totalJobs, 1)} tone="accent" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
                    <span>Evaluations run</span>
                  </div>
                  <MiniBar value={metrics.totalEvaluations} max={Math.max(metrics.totalJobs, 1)} tone="ok" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
                    <span>Resumes generated</span>
                  </div>
                  <MiniBar value={metrics.totalResumes} max={Math.max(metrics.totalJobs, 1)} tone="warn" />
                </div>
              </div>
            </Surface>
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <Surface className="p-5">
          <h2 className="text-[15px] font-semibold">Recent accounts</h2>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Latest signups with trial state and last sign-in.
          </p>
          <div className="mt-4 overflow-hidden rounded-[8px] border border-[var(--line)]">
            <table className="min-w-full border-collapse">
              <thead className="bg-[var(--surface-soft)]">
                <tr>
                  {["Email", "Signed up", "Last sign-in", "Trial", "Actions"].map((h) => (
                    <th key={h} className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((account) => (
                  <tr key={account.id} className="border-b border-dashed border-[var(--line-soft)] last:border-0">
                    <td className="px-4 py-3 text-[13px] font-semibold">{account.email}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">{formatDate(account.createdAt)}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">{formatDate(account.lastSignInAt)}</td>
                    <td className="px-4 py-3">
                      {account.trialDaysLeft > 0 ? (
                        <Badge tone="ok">{account.trialDaysLeft}d left</Badge>
                      ) : (
                        <Badge tone="warn">Expired</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {account.email.toLowerCase() !== ADMIN_EMAIL ? (
                        <AdminDeleteButton userId={account.id} userEmail={account.email} />
                      ) : (
                        <span className="font-mono text-[10px] text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      )}

      {/* ── INVITES TAB ── */}
      {tab === "invites" && <AdminInvites initial={invites} />}

      {/* ── ACTIVITY TAB ── */}
      {tab === "activity" && (
        <div className="space-y-6">
          <Surface className="p-5">
            <h2 className="text-[15px] font-semibold">Recent task runs</h2>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              Last 20 background tasks across all users.
            </p>
            <div className="mt-4 overflow-hidden rounded-[8px] border border-[var(--line)]">
              <table className="min-w-full border-collapse">
                <thead className="bg-[var(--surface-soft)]">
                  <tr>
                    {["Type", "Status", "User", "When", "Error"].map((h) => (
                      <th key={h} className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTaskRuns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-[13px] text-[var(--muted-foreground)]">
                        No task runs recorded yet.
                      </td>
                    </tr>
                  ) : recentTaskRuns.map((run) => (
                    <tr key={run.id} className="border-b border-dashed border-[var(--line-soft)] last:border-0">
                      <td className="px-4 py-3">
                        <span className="rounded bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] text-[var(--foreground)]">
                          {run.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={run.status === "completed" ? "ok" : run.status === "failed" ? "warn" : undefined}
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--muted-foreground)]">
                        {run.user_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">
                        {formatDate(run.created_at)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[11px] text-[var(--bad)]">
                        {run.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              label="Total task runs"
              value={String(metrics.totalTaskRuns)}
              sublabel="all time"
            />
            <StatCard
              label="Failed runs"
              value={String(metrics.failedTaskRuns)}
              sublabel={`${metrics.totalTaskRuns > 0 ? Math.round((metrics.failedTaskRuns / metrics.totalTaskRuns) * 100) : 0}% failure rate`}
              tone={metrics.failedTaskRuns > 0 ? "warn" : "ok"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
