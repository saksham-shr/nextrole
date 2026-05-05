"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  Eyebrow,
  SectionTitle,
  Surface,
  Timeline,
} from "@/components/nextrole/ui";

type AttentionItem = {
  title: string;
  body: string;
  href: string;
  tone: "warn" | "default";
};

type TaskRun = {
  id: string;
  type: string;
  status: string;
  progress_message: string | null;
  error: string | null;
  created_at: string;
};

type TopJob = {
  id: string;
  title: string;
  company: string;
  score: number | null;
  status: string;
};

const STATUS_TONE: Record<string, "ok" | "bad" | "warn" | "default"> = {
  completed: "ok",
  failed: "bad",
  running: "warn",
  queued: "default",
  cancelled: "default",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name}.`;
}

const QUICK_ACTIONS = [
  { label: "Evaluate a job", href: "/dashboard/evaluate", accent: true },
  { label: "Add to pipeline", href: "/dashboard/pipeline", accent: false },
  { label: "Open tracker", href: "/dashboard/tracker", accent: false },
  { label: "Run scanner", href: "/dashboard/scanner", accent: false },
  { label: "Settings / CV", href: "/dashboard/settings", accent: false },
  { label: "Providers", href: "/dashboard/providers", accent: false },
];

type SetupStep = {
  label: string;
  description: string;
  href: string;
  done: boolean;
};

function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Surface tone="accent" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Getting started</Eyebrow>
          <h2 className="mt-2 text-lg font-bold">
            Complete your setup — {doneCount} of {steps.length} done
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${s.done ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <a
            key={step.label}
            href={step.done ? undefined : step.href}
            className={`group rounded-[18px] border p-4 transition ${
              step.done
                ? "cursor-default border-[var(--ok)] bg-[#eef8f0]"
                : "cursor-pointer border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]"
            }`}
          >
            <div
              className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step.done
                  ? "bg-[var(--ok)] text-white"
                  : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted-foreground)]"
              }`}
            >
              {step.done ? "✓" : "→"}
            </div>
            <p className={`text-sm font-bold ${step.done ? "text-[var(--ok)]" : ""}`}>{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{step.description}</p>
          </a>
        ))}
      </div>
    </Surface>
  );
}

function ProviderBanner() {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--accent)] bg-[#fcefe7] px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white text-sm font-bold">
          !
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">No AI provider connected</p>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Add an Anthropic, OpenAI, or Gemini API key to unlock evaluations, resume tailoring, and all AI workflows.
          </p>
        </div>
      </div>
      <Button href="/dashboard/providers" tone="accent">
        Connect API key →
      </Button>
    </div>
  );
}

function ExtensionCard() {
  return (
    <Surface className="p-5">
      <SectionTitle
        title="Browser extension"
        subtitle="One-click job save + auto-fill"
      />
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Install the NextRole extension to save jobs from any site and auto-fill application forms using your profile.
      </p>
      <div className="mt-4 space-y-2 text-sm text-[var(--muted-foreground)]">
        {[
          ["1", "Install the Chrome extension"],
          ["2", "Open NextRole settings → API Key tab"],
          ["3", "Copy your key and paste it in the extension"],
          ["4", "Visit any job page and click the orange button"],
        ].map(([n, step]) => (
          <div key={n} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] font-mono text-[10px] font-bold text-[var(--muted-foreground)]">
              {n}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Button disabled tone="accent" className="w-full justify-center opacity-50 cursor-not-allowed">
          Download — coming soon
        </Button>
        <Button href="/dashboard/providers" ghost className="w-full justify-center">
          Connect AI provider
        </Button>
      </div>
    </Surface>
  );
}

function ScorePill({ score }: { score: number }) {
  const pct = Math.round((score / 5) * 100);
  const isOk = pct >= 75;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{
        background: isOk ? "rgba(47,122,58,0.08)" : "rgba(176,122,24,0.08)",
        border: `1px solid ${isOk ? "var(--ok)" : "var(--warn)"}`,
        color: isOk ? "var(--ok)" : "var(--warn)",
      }}
    >
      {pct}% fit
    </span>
  );
}

export function DashboardHome({
  userName,
  hasCV,
  hasProvider,
  hasJobs,
  kpis,
  attentionItems,
  topJobs,
  recentRuns,
}: {
  userName: string;
  hasCV: boolean;
  hasProvider: boolean;
  hasJobs: boolean;
  kpis: {
    active: number;
    interviews: number;
    offers: number;
    highScore: number;
    pending: number;
  };
  attentionItems: AttentionItem[];
  topJobs: TopJob[];
  recentRuns: TaskRun[];
}) {
  const setupComplete = hasCV && hasProvider;

  const setupSteps: SetupStep[] = [
    {
      label: "Add your CV",
      description: "Paste your base CV — the AI reads it in every evaluation.",
      href: "/dashboard/settings",
      done: hasCV,
    },
    {
      label: "Connect a provider",
      description: "Add an Anthropic, OpenAI, or Gemini API key to run AI workflows.",
      href: "/dashboard/providers",
      done: hasProvider,
    },
    {
      label: "Add a job",
      description: "Paste a job description into the pipeline to get started.",
      href: "/dashboard/pipeline",
      done: hasJobs,
    },
    {
      label: "Run an evaluation",
      description: "Score your first role and see how well it fits your profile.",
      href: "/dashboard/evaluate",
      done: kpis.active > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Greeting row ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            NextRole workspace
          </p>
          <h1
            className="mt-2 text-[clamp(28px,4vw,40px)] font-normal leading-[1.1] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {setupComplete ? greeting(userName) : `Hi ${userName} — let's get you set up.`}
          </h1>
          {setupComplete && kpis.active > 0 && (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {kpis.active} active {kpis.active === 1 ? "role" : "roles"} in the pipeline.
              {kpis.interviews > 0 && ` ${kpis.interviews} in interview.`}
            </p>
          )}
        </div>
        <Button href="/dashboard/pipeline" tone="accent">
          + Add a job
        </Button>
      </div>

      {/* ── Provider banner ── */}
      {!hasProvider && <ProviderBanner />}

      {/* ── Setup checklist ── */}
      <SetupChecklist steps={setupSteps} />

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Active", value: kpis.active, sub: "in pipeline", accent: kpis.active > 0 },
          { label: "Interviews", value: kpis.interviews, sub: "in flight", accent: kpis.interviews > 0 },
          { label: "Offers", value: kpis.offers, sub: "received", accent: kpis.offers > 0 },
          { label: "Pending triage", value: kpis.pending, sub: "to review", accent: false },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
            style={{ boxShadow: "2px 3px 0 rgba(26,24,20,0.06)" }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              {m.label}
            </p>
            <p
              className={`mt-2 text-[38px] leading-none ${m.accent ? "text-[var(--accent)]" : ""}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {m.value}
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main two-column ── */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {/* Left: attention items + worth a look */}
        <div className="space-y-6">
          {/* Attention items */}
          {attentionItems.length > 0 && (
            <Surface className="p-5">
              <SectionTitle
                title="Needs your attention"
                subtitle={`${attentionItems.length} ${attentionItems.length === 1 ? "item" : "items"} requiring action`}
              />
              <div className="space-y-1">
                {attentionItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[var(--line-soft)] py-3 last:border-b-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={item.tone} fill={item.tone === "warn"}>
                          {item.tone === "warn" ? "Action" : "Todo"}
                        </Badge>
                        <p className="text-sm font-bold">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.body}</p>
                    </div>
                    <Button href={item.href} ghost tone={item.tone}>Open</Button>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* Worth a look */}
          <Surface className="p-5">
            <SectionTitle
              title="Worth a look"
              subtitle="Your top-scored evaluated roles"
              action={<Button href="/dashboard/tracker">View all</Button>}
            />
            {topJobs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No evaluated roles yet — add jobs to the pipeline and run an evaluation.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Button tone="accent" href="/dashboard/evaluate">Evaluate a job</Button>
                  <Button href="/dashboard/pipeline" ghost>Add to pipeline</Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {topJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/tracker`}
                    className="grid items-center gap-4 rounded-2xl border border-[var(--line-soft)] bg-[var(--background)] px-5 py-4 transition hover:border-[var(--accent)]"
                    style={{ gridTemplateColumns: "1fr auto auto" }}
                  >
                    <div>
                      <p className="text-[14px] font-semibold">{job.title}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">{job.company}</p>
                    </div>
                    {job.score !== null && <ScorePill score={job.score} />}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground-2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </Surface>
        </div>

        {/* Right: quick actions + activity */}
        <div className="space-y-6">
          <Surface className="p-5">
            <SectionTitle title="Quick actions" subtitle="Fast entry points" />
            <div className="grid gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.href}
                  href={action.href}
                  tone={action.accent ? "accent" : "default"}
                  className="w-full justify-start"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Surface>

          <ExtensionCard />

          <Surface className="p-5">
            <SectionTitle
              title="Recent activity"
              subtitle="Task runs and background jobs"
              action={<Button href="/dashboard/activity" ghost>All</Button>}
            />
            {recentRuns.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">No tasks run yet.</p>
            ) : (
              <Timeline
                items={recentRuns.map((run) => ({
                  title: (
                    <span className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[run.status] ?? "default"}>{run.status}</Badge>
                      <span>{run.type}</span>
                    </span>
                  ) as unknown as string,
                  subtitle: run.error ?? run.progress_message ?? run.type,
                  time: timeAgo(run.created_at),
                }))}
              />
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
