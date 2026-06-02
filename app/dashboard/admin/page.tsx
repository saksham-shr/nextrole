import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, AdminAuditLogRow, InviteRow, UserTier } from "@/lib/db/types";
import { Badge, StatCard, Surface } from "@/components/nextrole/ui";
import { AdminInvites } from "@/components/nextrole/admin-invites";
import { AdminUsersTable, type AdminUserRow } from "@/components/nextrole/admin-users-table";
import { AdminAuditLog } from "@/components/nextrole/admin-audit-log";
import { AdminCommerce } from "@/components/nextrole/admin-commerce";
import { getCommerceConfig, getCommerceDefaults } from "@/lib/commerce/config";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const d = new Date(value);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function startOfDayUTC(daysBack: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d;
}

function MiniBar({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "ok" | "warn" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = { accent: "var(--accent)", ok: "var(--ok)", warn: "var(--warn)" };
  return (
    <div className="flex items-center gap-2">
      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[tone] }} />
      </div>
      <span className="w-8 text-right font-mono text-[11px] text-[var(--muted-foreground)]">{value}</span>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-12 items-end gap-1">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            minHeight: 2,
            background: "var(--accent)",
            opacity: 0.4 + (v / max) * 0.6,
          }}
          title={`${v}`}
        />
      ))}
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

  if (!canUseAdmin) {
    return (
      <div className="space-y-6">
        <Header />
        <Surface tone="warn" className="p-5">
          <h2 className="text-lg font-bold">Service role key required</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code> to unlock the admin panel.
          </p>
        </Surface>
      </div>
    );
  }

  const admin = createAdminClient();
  const adminAuth = createSupabaseClient<Database>(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sevenDaysAgo  = startOfDayUTC(6).toISOString(); // last 7 days inclusive
  const thirtyDaysAgo = startOfDayUTC(29).toISOString();

  // Paginate listUsers — the auth admin API returns at most ~1000 per page
  // and earlier code silently truncated at 200. Without this, every count,
  // tab, and management action below would treat the first 200 users as
  // the entire system once we crossed that threshold.
  async function listAllAuthUsers(perPage = 200, maxPages = 50) {
    type ListUsersRes = Awaited<ReturnType<typeof adminAuth.auth.admin.listUsers>>;
    type AuthUser = ListUsersRes["data"]["users"][number];
    const all: AuthUser[] = [];
    let lastError: ListUsersRes["error"] = null;
    for (let page = 1; page <= maxPages; page++) {
      const res = await adminAuth.auth.admin.listUsers({ page, perPage });
      if (res.error) { lastError = res.error; break; }
      const batch = res.data?.users ?? [];
      all.push(...batch);
      if (batch.length < perPage) break;
    }
    return { data: { users: all }, error: lastError };
  }

  const [
    usersResult, jobsResult, evaluationsResult, resumesResult,
    profilesResult, invitesResult, auditResult,
    recentSignupsResult, activeUsersResult, recentTopupsResult,
  ] = await Promise.all([
    listAllAuthUsers(),
    admin.from("jobs").select("*", { count: "exact", head: true }),
    admin.from("evaluations").select("*", { count: "exact", head: true }),
    admin.from("resumes").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("id, tier, credits_remaining, subscription_ends_at"),
    admin.from("invites").select("*").order("created_at", { ascending: false }),
    admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("profiles").select("created_at").gte("created_at", sevenDaysAgo),
    admin.from("usage_log").select("user_id").gte("created_at", sevenDaysAgo),
    admin.from("usage_log").select("credits_used, created_at").eq("task_type", "topup").gte("created_at", thirtyDaysAgo),
  ]);

  // ── Build user list joined with profile data ─────────────────────────────
  const profilesById = new Map<string, { tier: UserTier; credits: number; subscriptionEndsAt: string | null }>();
  for (const p of (profilesResult.data ?? [])) {
    profilesById.set(p.id, {
      tier: (p.tier as UserTier) ?? "free",
      credits: p.credits_remaining ?? 0,
      subscriptionEndsAt: (p.subscription_ends_at as string | null) ?? null,
    });
  }

  const allUsers: AdminUserRow[] = (usersResult.data?.users ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((account) => {
      const p = profilesById.get(account.id);
      return {
        id: account.id,
        email: account.email ?? "Unknown",
        createdAt: account.created_at,
        lastSignInAt: account.last_sign_in_at ?? null,
        tier: p?.tier ?? "free",
        credits: p?.credits ?? 0,
        subscriptionEndsAt: p?.subscriptionEndsAt ?? null,
      };
    });

  // ── Aggregate metrics ────────────────────────────────────────────────────
  const profileRows = profilesResult.data ?? [];
  const freeUsers    = profileRows.filter((p) => p.tier === "free").length;
  const starterUsers = profileRows.filter((p) => p.tier === "starter").length;
  const proUsers     = profileRows.filter((p) => p.tier === "pro").length;
  const totalUsers   = profileRows.length || allUsers.length;

  // 7-day signup buckets
  const signupBuckets: number[] = Array(7).fill(0);
  for (const row of (recentSignupsResult.data ?? [])) {
    const d = new Date(row.created_at as string);
    const dayIdx = 6 - Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (dayIdx >= 0 && dayIdx < 7) signupBuckets[dayIdx] += 1;
  }
  const signupsLast7 = signupBuckets.reduce((s, n) => s + n, 0);

  // Active users in last 7 days (distinct user_id from usage_log)
  const activeUserIds = new Set((activeUsersResult.data ?? []).map((r) => r.user_id as string));
  const activeUsers7d = activeUserIds.size;

  // Revenue: topup rows have credits_used as negative (refund-style). Pack values map back.
  const topupCount30 = (recentTopupsResult.data ?? []).length;

  const invites = (invitesResult.data ?? []) as InviteRow[];
  const auditLog = (auditResult.data ?? []) as AdminAuditLogRow[];

  // Commerce config only fetched when the tab is open (cheap, but skip otherwise).
  const commerceConfig = tab === "commerce" ? await getCommerceConfig() : null;
  const commerceDefaults = tab === "commerce" ? getCommerceDefaults() : null;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users",    label: `Users (${allUsers.length})` },
    { id: "invites",  label: `Invites (${invites.length})` },
    { id: "commerce", label: "Commerce" },
    { id: "audit",    label: `Audit (${auditLog.length})` },
  ];

  const tabLinkClass = (id: string) =>
    `rounded-[6px] px-3.5 py-2 text-[13px] font-medium transition ${
      tab === id
        ? "bg-[var(--surface)] border border-[var(--line-soft)] text-[var(--foreground)]"
        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="space-y-6">
      <Header />

      <div className="flex flex-wrap gap-1 border-b border-[var(--line-soft)] pb-0">
        {tabs.map(({ id, label }) => (
          <a key={id} href={`?tab=${id}`} className={tabLinkClass(id)}>
            {label}
          </a>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={String(totalUsers)} sublabel="profiles" tone="accent" />
            <StatCard label="Signups · 7d" value={String(signupsLast7)} sublabel="new accounts" />
            <StatCard label="Active · 7d" value={String(activeUsers7d)} sublabel="with AI usage" tone="ok" />
            <StatCard label="Topups · 30d" value={String(topupCount30)} sublabel="purchases" tone={topupCount30 > 0 ? "ok" : undefined} />
            <StatCard label="Pro" value={String(proUsers)} sublabel="paid tier" tone="ok" />
            <StatCard label="Starter" value={String(starterUsers)} sublabel="paid tier" />
            <StatCard label="Free" value={String(freeUsers)} sublabel="free tier" />
            <StatCard label="Invites" value={String(invites.length)} sublabel={`${invites.filter((i) => !!i.used_at).length} used`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Surface className="p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold">Signups · last 7 days</h2>
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{signupsLast7} total</span>
              </div>
              <div className="mt-4">
                <Sparkline data={signupBuckets} />
                <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--muted-foreground)]">
                  {signupBuckets.map((_, i) => {
                    const d = new Date();
                    d.setUTCDate(d.getUTCDate() - (6 - i));
                    return <span key={i}>{d.getUTCDate()}</span>;
                  })}
                </div>
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="text-[15px] font-semibold">Tier distribution</h2>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Pro", val: proUsers, tone: "ok" as const },
                  { label: "Starter", val: starterUsers, tone: "accent" as const },
                  { label: "Free", val: freeUsers, tone: "warn" as const },
                ].map(({ label, val, tone }) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
                      <span>{label}</span>
                      <span>{totalUsers > 0 ? Math.round((val / totalUsers) * 100) : 0}%</span>
                    </div>
                    <MiniBar value={val} max={totalUsers} tone={tone} />
                  </div>
                ))}
              </div>
            </Surface>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Jobs" value={String(jobsResult.count ?? 0)} sublabel="tracked across all users" />
            <StatCard label="Evaluations" value={String(evaluationsResult.count ?? 0)} sublabel="completed analyses" />
            <StatCard label="Resumes" value={String(resumesResult.count ?? 0)} sublabel="generated" />
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <Surface className="p-5">
          <h2 className="text-[15px] font-semibold">All users</h2>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Search by email, click Manage to grant tiers, reset credits, or delete accounts. Every action is logged.
          </p>
          <div className="mt-4">
            <AdminUsersTable users={allUsers} />
          </div>
        </Surface>
      )}

      {/* ── INVITES ── */}
      {tab === "invites" && <AdminInvites initial={invites} />}

      {/* ── COMMERCE ── */}
      {tab === "commerce" && commerceConfig && commerceDefaults && (
        <Surface className="p-5">
          <h2 className="text-[15px] font-semibold">Pricing &amp; commerce</h2>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Live overrides for plan prices, top-up packs, and feature flags. Server enforces these at order time;
            changes propagate within 30 seconds via a server cache.
          </p>
          <div className="mt-5">
            <AdminCommerce initial={commerceConfig} defaults={commerceDefaults} />
          </div>
        </Surface>
      )}

      {/* ── AUDIT ── */}
      {tab === "audit" && (
        <Surface className="p-5">
          <h2 className="text-[15px] font-semibold">Admin audit log</h2>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Every mutable admin action, with before/after state. Showing the last 200 entries.
          </p>
          <div className="mt-4">
            <AdminAuditLog rows={auditLog} />
          </div>
        </Surface>
      )}

    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
          Admin panel
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Workspace control</h1>
      </div>
      <Badge tone="accent">Admins only</Badge>
    </div>
  );
}
