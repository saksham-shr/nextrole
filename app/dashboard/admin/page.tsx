import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { Badge, StatCard, Surface } from "@/components/nextrole/ui";
import { AdminDeleteButton } from "@/components/nextrole/admin-delete-button";

const NOW_MS = Date.now();
const ADMIN_EMAIL = "sakshamsharma614@gmail.com";

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = (user?.email ?? "").toLowerCase();
  if (!user || email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const canUseAdmin = Boolean(url && serviceRoleKey);

  let metrics = {
    totalUsers: 0,
    totalJobs: 0,
    totalEvaluations: 0,
    totalResumes: 0,
    totalTaskRuns: 0,
    activeTrialUsers: 0,
    usersSignedInAtLeastOnce: 0,
  };

  let recentUsers: Array<{
    id: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
    trialDaysLeft: number;
  }> = [];

  if (canUseAdmin && url && serviceRoleKey) {
    const admin = createSupabaseAdminClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [
      usersResult,
      jobsResult,
      evaluationsResult,
      resumesResult,
      taskRunsResult,
      profilesResult,
    ] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("jobs").select("*", { count: "exact", head: true }),
      admin.from("evaluations").select("*", { count: "exact", head: true }),
      admin.from("resumes").select("*", { count: "exact", head: true }),
      admin.from("task_runs").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }),
    ]);

    const users = (usersResult.data?.users ?? []).slice().sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const withTrialInfo = users.map((account) => {
      const created = new Date(account.created_at).getTime();
      const diffDays = Math.floor((NOW_MS - created) / 86400000);
      return {
        id: account.id,
        email: account.email ?? "Unknown",
        createdAt: account.created_at,
        lastSignInAt: account.last_sign_in_at ?? null,
        trialDaysLeft: Math.max(0, 14 - diffDays),
      };
    });

    metrics = {
      totalUsers: profilesResult.count ?? users.length,
      totalJobs: jobsResult.count ?? 0,
      totalEvaluations: evaluationsResult.count ?? 0,
      totalResumes: resumesResult.count ?? 0,
      totalTaskRuns: taskRunsResult.count ?? 0,
      activeTrialUsers: withTrialInfo.filter((account) => account.trialDaysLeft > 0).length,
      usersSignedInAtLeastOnce: withTrialInfo.filter((account) => account.lastSignInAt).length,
    };

    recentUsers = withTrialInfo.slice(0, 12);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Admin analytics
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Private workspace metrics</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
            Internal view for signups, sign-ins, trial activity, and system usage.
          </p>
        </div>
        <Badge tone="accent">Admins only</Badge>
      </div>

      {!canUseAdmin ? (
        <Surface tone="warn" className="p-5">
          <h2 className="text-lg font-bold">Service role key required</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to unlock global analytics across users. Without that key, this page
            stays private but cannot query account-wide metrics.
          </p>
        </Surface>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Accounts" value={String(metrics.totalUsers)} sublabel="profiles in system" tone="accent" />
        <StatCard label="Signed in" value={String(metrics.usersSignedInAtLeastOnce)} sublabel="users with login activity" />
        <StatCard label="Trial users" value={String(metrics.activeTrialUsers)} sublabel="within 14-day free trial" tone="ok" />
        <StatCard label="Jobs" value={String(metrics.totalJobs)} sublabel="tracked across all users" />
        <StatCard label="Evaluations" value={String(metrics.totalEvaluations)} sublabel="completed AI analyses" />
        <StatCard label="Resumes" value={String(metrics.totalResumes)} sublabel="generated resume records" />
        <StatCard label="Task runs" value={String(metrics.totalTaskRuns)} sublabel="background or workflow tasks" />
        <StatCard label="Admin access" value="Active" sublabel={user.email ?? ""} tone="warn" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface className="p-5">
          <h2 className="text-lg font-bold">Recent account activity</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
            Latest users, trial state, and last sign-in activity.
          </p>
          <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--line)]">
            <table className="min-w-full border-collapse">
              <thead className="bg-[var(--surface-soft)]">
                <tr>
                  <th className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Email</th>
                  <th className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Created</th>
                  <th className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Last sign-in</th>
                  <th className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Trial</th>
                  <th className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((account) => (
                  <tr key={account.id} className="border-b border-dashed border-[var(--line-soft)] last:border-b-0">
                    <td className="px-4 py-3 text-sm font-semibold">{account.email}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{formatDate(account.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{formatDate(account.lastSignInAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {account.trialDaysLeft > 0 ? (
                        <Badge tone="ok">{`${account.trialDaysLeft} days left`}</Badge>
                      ) : (
                        <Badge tone="warn">Expired</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {account.email.toLowerCase() !== ADMIN_EMAIL ? (
                        <AdminDeleteButton userId={account.id} userEmail={account.email} />
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="text-lg font-bold">What this page tells you</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>How many accounts exist and how many have signed in at least once.</p>
            <p>How many users are still inside the 14-day trial window.</p>
            <p>How much workflow activity exists across jobs, evaluations, resumes, and task runs.</p>
            <p>Which accounts were created recently and when they last signed in.</p>
          </div>
        </Surface>
      </div>
    </div>
  );
}
