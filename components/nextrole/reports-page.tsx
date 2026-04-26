"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  Display,
  EmptyState,
  Eyebrow,
  StatCard,
  Surface,
} from "@/components/nextrole/ui";
import type { ReportRow } from "@/lib/db/types";

export type ReportWithJob = ReportRow & {
  jobs: { title: string; company: string } | null;
};

// Shape stored in report.content by the evaluate route
interface ReportContent {
  score: number;
  decision: string;
  job_title: string;
  job_company: string;
  provider: string;
  model: string;
  blocks: {
    role_fit?: { score?: number; summary?: string; details?: string; signals?: string[] };
    compensation_analysis?: { score?: number; summary?: string; details?: string; market_position?: string };
    cv_match?: { score?: number; summary?: string; coverage?: string; gaps?: string[]; strengths?: string[] };
    personalization_guidance?: { summary?: string; tactics?: string[]; angle?: string };
    interview_signals?: { likely_topics?: string[]; red_flags?: string[]; preparation_notes?: string };
    legitimacy_check?: { score?: number; verdict?: string; notes?: string };
    decision?: { score?: number; decision?: string; rationale?: string; priority?: string };
  };
}

function isReportContent(v: unknown): v is ReportContent {
  return typeof v === "object" && v !== null && "blocks" in v;
}

const DECISION_TONES: Record<string, "ok" | "warn" | "bad" | "default"> = {
  apply: "ok",
  watch: "warn",
  skip: "bad",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── List view ─────────────────────────────────────────────────────────────────

export function ReportsPageContent({ reports }: { reports: ReportWithJob[] }) {
  const content = reports
    .map((r) => r.content)
    .filter(isReportContent);

  const avgScore =
    content.length > 0
      ? (content.reduce((sum, c) => sum + Number(c.score), 0) / content.length).toFixed(1)
      : "—";

  const applyCount = content.filter((c) => c.decision === "apply").length;

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Reports</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Long-form evaluation reports, decisions, and role artifacts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total reports" value={String(reports.length)} sublabel="all evaluations" />
        <StatCard label="Avg score" value={avgScore} sublabel="1.0–5.0 scale" />
        <StatCard
          label="Apply"
          value={String(applyCount)}
          sublabel="recommended to apply"
          tone={applyCount > 0 ? "ok" : "default"}
        />
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          body="Run an evaluation to automatically generate a report here."
          action={
            <Button href="/dashboard/evaluate" tone="accent">
              Evaluate a job
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const c = isReportContent(report.content) ? report.content : null;
            const decision = c?.decision ?? null;
            return (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="block"
              >
                <Surface className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {decision && (
                        <Badge tone={DECISION_TONES[decision] ?? "default"}>
                          {decision}
                        </Badge>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{report.title}</p>
                        {c && (
                          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                            Score: {c.score} · {c.provider}/{c.model}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                </Surface>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

function BlockCard({
  title,
  score,
  children,
}: {
  title: string;
  score?: number;
  children: React.ReactNode;
}) {
  return (
    <Surface className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        {score !== undefined && (
          <span className="font-mono text-sm font-bold">{score.toFixed(1)}</span>
        )}
      </div>
      <div className="space-y-2 text-sm leading-6 text-[var(--foreground)]">{children}</div>
    </Surface>
  );
}

function StringList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="ml-4 list-disc space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-[var(--muted-foreground)]">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ReportDetailPageContent({ report }: { report: ReportWithJob }) {
  const c = isReportContent(report.content) ? report.content : null;

  if (!c) {
    return (
      <div className="space-y-8">
        <div className="mb-8">
          <Eyebrow>Report</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">{report.title}</Display>
        </div>
        <Surface className="p-5">
          <p className="text-sm text-[var(--muted-foreground)]">
            Report content is not available for this record.
          </p>
        </Surface>
        <Button href="/dashboard/reports">← Back to reports</Button>
      </div>
    );
  }

  const blocks = c.blocks;

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <Eyebrow>Report</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">{report.title}</Display>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge tone={DECISION_TONES[c.decision] ?? "default"}>{c.decision}</Badge>
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            Score: {c.score} · {c.provider} / {c.model} · {formatDate(report.created_at)}
          </span>
        </div>
      </div>

      {blocks.role_fit && (
        <BlockCard title="Role fit" score={blocks.role_fit.score}>
          {blocks.role_fit.summary && <p>{blocks.role_fit.summary}</p>}
          {blocks.role_fit.details && (
            <p className="text-[var(--muted-foreground)]">{blocks.role_fit.details}</p>
          )}
          {blocks.role_fit.signals && blocks.role_fit.signals.length > 0 && (
            <div>
              <p className="mb-1 font-medium">Signals</p>
              <StringList items={blocks.role_fit.signals} />
            </div>
          )}
        </BlockCard>
      )}

      {blocks.compensation_analysis && (
        <BlockCard title="Compensation" score={blocks.compensation_analysis.score}>
          {blocks.compensation_analysis.summary && (
            <p>{blocks.compensation_analysis.summary}</p>
          )}
          {blocks.compensation_analysis.market_position && (
            <p className="text-[var(--muted-foreground)]">
              Market position: {blocks.compensation_analysis.market_position}
            </p>
          )}
          {blocks.compensation_analysis.details && (
            <p className="text-[var(--muted-foreground)]">
              {blocks.compensation_analysis.details}
            </p>
          )}
        </BlockCard>
      )}

      {blocks.cv_match && (
        <BlockCard title="CV match" score={blocks.cv_match.score}>
          {blocks.cv_match.summary && <p>{blocks.cv_match.summary}</p>}
          {blocks.cv_match.coverage && (
            <p className="text-[var(--muted-foreground)]">Coverage: {blocks.cv_match.coverage}</p>
          )}
          {blocks.cv_match.strengths && blocks.cv_match.strengths.length > 0 && (
            <div>
              <p className="mb-1 font-medium">Strengths</p>
              <StringList items={blocks.cv_match.strengths} />
            </div>
          )}
          {blocks.cv_match.gaps && blocks.cv_match.gaps.length > 0 && (
            <div>
              <p className="mb-1 font-medium">Gaps</p>
              <StringList items={blocks.cv_match.gaps} />
            </div>
          )}
        </BlockCard>
      )}

      {blocks.personalization_guidance && (
        <BlockCard title="Personalization guidance">
          {blocks.personalization_guidance.summary && (
            <p>{blocks.personalization_guidance.summary}</p>
          )}
          {blocks.personalization_guidance.angle && (
            <p className="text-[var(--muted-foreground)]">
              Angle: {blocks.personalization_guidance.angle}
            </p>
          )}
          {blocks.personalization_guidance.tactics &&
            blocks.personalization_guidance.tactics.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Tactics</p>
                <StringList items={blocks.personalization_guidance.tactics} />
              </div>
            )}
        </BlockCard>
      )}

      {blocks.interview_signals && (
        <BlockCard title="Interview signals">
          {blocks.interview_signals.preparation_notes && (
            <p>{blocks.interview_signals.preparation_notes}</p>
          )}
          {blocks.interview_signals.likely_topics &&
            blocks.interview_signals.likely_topics.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Likely topics</p>
                <StringList items={blocks.interview_signals.likely_topics} />
              </div>
            )}
          {blocks.interview_signals.red_flags &&
            blocks.interview_signals.red_flags.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-[var(--bad)]">Red flags</p>
                <StringList items={blocks.interview_signals.red_flags} />
              </div>
            )}
        </BlockCard>
      )}

      {blocks.legitimacy_check && (
        <BlockCard title="Legitimacy check" score={blocks.legitimacy_check.score}>
          {blocks.legitimacy_check.verdict && (
            <p className="font-medium">{blocks.legitimacy_check.verdict}</p>
          )}
          {blocks.legitimacy_check.notes && (
            <p className="text-[var(--muted-foreground)]">{blocks.legitimacy_check.notes}</p>
          )}
        </BlockCard>
      )}

      {blocks.decision && (
        <BlockCard title="Decision" score={blocks.decision.score}>
          {blocks.decision.decision && (
            <Badge tone={DECISION_TONES[blocks.decision.decision] ?? "default"}>
              {blocks.decision.decision}
            </Badge>
          )}
          {blocks.decision.rationale && (
            <p className="mt-2">{blocks.decision.rationale}</p>
          )}
          {blocks.decision.priority && (
            <p className="text-[var(--muted-foreground)]">
              Priority: {blocks.decision.priority}
            </p>
          )}
        </BlockCard>
      )}

      <div className="pt-2">
        <Button href="/dashboard/reports">← Back to reports</Button>
      </div>
    </div>
  );
}
