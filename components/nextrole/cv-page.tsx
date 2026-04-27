"use client";

import { useState, useMemo } from "react";
import {
  Badge,
  Button,
  Display,
  Eyebrow,
  SectionTitle,
  Surface,
} from "@/components/nextrole/ui";
import { saveCV } from "@/app/actions/profile";

// ─── CV analysis helpers ──────────────────────────────────────────────────────

const SECTION_PATTERNS: Array<{ label: string; patterns: RegExp[] }> = [
  {
    label: "Experience",
    patterns: [/\b(experience|employment|work history|career|positions?)\b/i],
  },
  {
    label: "Education",
    patterns: [/\b(education|academic|degree|university|college|school)\b/i],
  },
  {
    label: "Skills",
    patterns: [/\b(skills?|technologies|tools|stack|competencies|expertise)\b/i],
  },
  {
    label: "Summary",
    patterns: [/\b(summary|profile|about|objective|bio|introduction)\b/i],
  },
  {
    label: "Projects",
    patterns: [/\b(projects?|portfolio|side projects?|open.?source)\b/i],
  },
  {
    label: "Certifications",
    patterns: [/\b(certifications?|awards?|achievements?|publications?)\b/i],
  },
];

const ACTION_VERBS = /\b(led|built|designed|developed|implemented|created|managed|reduced|increased|improved|launched|delivered|architected|scaled|migrated|deployed|optimised|optimized|streamlined|drove|established|spearheaded|oversaw|coordinated|collaborated|mentored|trained|automated|refactored|shipped|owned|grew|saved|generated|defined|prioritised|prioritized)\b/i;

function analyseCv(text: string) {
  if (!text.trim()) {
    return { words: 0, chars: 0, sections: [], proofPoints: 0 };
  }

  const words = text.trim().split(/\s+/).length;
  const chars = text.length;

  const sections = SECTION_PATTERNS.map(({ label, patterns }) => ({
    label,
    found: patterns.some((p) => p.test(text)),
  }));

  // Extract lines starting with bullet markers or containing action verbs near start
  const lines = text.split(/\n/);
  const proofPoints = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const isBullet = /^[-•*·▪▸>]/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
    return isBullet && ACTION_VERBS.test(trimmed.slice(0, 80));
  }).length;

  return { words, chars, sections, proofPoints };
}

// ─── Word count meter ─────────────────────────────────────────────────────────

function WordMeter({ words }: { words: number }) {
  const min = 400;
  const ideal = 600;
  const max = 1000;
  const pct = Math.min(100, (words / max) * 100);

  const tone =
    words === 0
      ? "default"
      : words < min
        ? "bad"
        : words <= ideal * 1.4
          ? "ok"
          : "warn";

  const label =
    words === 0
      ? "Paste your CV above"
      : words < min
        ? `${words} words — too short (aim for ${min}+)`
        : words <= max
          ? `${words} words — good length`
          : `${words} words — consider trimming below ${max}`;

  const barColor =
    tone === "bad" ? "bg-[var(--bad)]" : tone === "ok" ? "bg-[var(--ok)]" : "bg-[var(--warn)]";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {label}
        </span>
        <Badge tone={tone === "default" ? "default" : tone === "ok" ? "ok" : tone === "bad" ? "bad" : "warn"}>
          {words} words
        </Badge>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${words > 0 ? barColor : "bg-[var(--line-soft)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Section checklist ────────────────────────────────────────────────────────

function SectionChecklist({
  sections,
}: {
  sections: Array<{ label: string; found: boolean }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {sections.map(({ label, found }) => (
        <div
          key={label}
          className={`flex items-center gap-2 rounded-[14px] border px-3 py-2 ${
            found
              ? "border-[var(--ok)] bg-[#eef8f0]"
              : "border-[var(--line-soft)] bg-[var(--surface-soft)]"
          }`}
        >
          <span className={`text-xs ${found ? "text-[var(--ok)]" : "text-[var(--muted-foreground-2)]"}`}>
            {found ? "✓" : "○"}
          </span>
          <span className="text-xs font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CvPageContent({
  initialCv,
  error,
  message,
}: {
  initialCv: string | null;
  error?: string;
  message?: string;
}) {
  const [cvText, setCvText] = useState(initialCv ?? "");

  const analysis = useMemo(() => analyseCv(cvText), [cvText]);

  const foundCount = analysis.sections.filter((s) => s.found).length;
  const totalSections = analysis.sections.length;
  const completionPct = cvText.trim() ? Math.round((foundCount / totalSections) * 100) : 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">CV</Display>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Your base CV is read verbatim in every evaluation, resume tailoring, interview prep, and
          follow-up generation. Keep it current and complete.
        </p>
      </div>

      {error && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-[14px] border border-[var(--ok)] bg-[#eef8f0] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ok)]">
          {message}
        </p>
      )}

      {/* Live analysis panel */}
      {cvText.trim() && (
        <Surface
          tone={completionPct >= 80 ? "ok" : completionPct >= 50 ? "warn" : "default"}
          className="p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <SectionTitle
              title={`CV analysis — ${completionPct}% complete`}
              subtitle={`${foundCount} of ${totalSections} sections detected · ${analysis.proofPoints} proof-point bullets`}
            />
            <span className="font-[var(--font-caveat)] text-5xl font-bold leading-none text-[var(--accent)]">
              {completionPct}%
            </span>
          </div>

          <div className="space-y-4">
            <WordMeter words={analysis.words} />
            <SectionChecklist sections={analysis.sections} />

            {analysis.proofPoints > 0 && (
              <div className="flex items-center gap-3">
                <Badge tone="ok">{analysis.proofPoints} proof points</Badge>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Action-verb bullets detected — good for AI scoring
                </span>
              </div>
            )}
            {analysis.proofPoints === 0 && analysis.words > 50 && (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--warn)]">
                No action-verb bullets detected — add Led / Built / Reduced / Shipped bullets for stronger evaluations
              </p>
            )}
          </div>
        </Surface>
      )}

      {/* Editor */}
      <form action={saveCV} className="space-y-4">
        <Surface className="p-5">
          <SectionTitle
            title="Base CV"
            subtitle="Plain text or Markdown — no PDF. The AI reads this directly in every prompt."
          />

          <div className="mt-3">
            <textarea
              name="base_cv"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={28}
              placeholder={`Paste your full CV here. Example structure:\n\nAlex Johnson · alex@email.com · London\n\nSUMMARY\nSenior engineer with 8 years...\n\nEXPERIENCE\nStaff Engineer · Acme Corp · 2021–present\n• Led migration of monolith to microservices, reducing deploy time by 60%\n• Built real-time data pipeline processing 50M events/day\n\nEDUCATION\nBSc Computer Science · University of Manchester · 2015\n\nSKILLS\nTypeScript, Python, Go, PostgreSQL, Kubernetes, AWS`}
              className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-4 font-mono text-[12px] leading-6 text-[var(--foreground)] outline-none focus:border-[var(--accent)] resize-y"
            />
          </div>

          {/* Inline live stats below textarea */}
          {cvText.trim() && (
            <div className="mt-3 flex flex-wrap gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {analysis.words} words
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">·</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {analysis.chars.toLocaleString()} chars
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">·</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {cvText.split(/\n/).length} lines
              </span>
            </div>
          )}
        </Surface>

        <div className="flex gap-3">
          <Button type="submit" tone="accent">
            Save CV
          </Button>
          <Button href="/dashboard/settings" ghost>
            Full settings →
          </Button>
        </div>
      </form>

      {/* Tips */}
      <Surface className="p-5">
        <SectionTitle
          title="Tips for a high-signal CV"
          subtitle="The AI extracts proof points, skills, and seniority signals from this text"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              tip: "Use action verbs",
              detail: "Start bullets with Led, Built, Reduced, Shipped — these parse into proof points",
            },
            {
              tip: "Include metrics",
              detail: "Quantify impact: 60% faster, 50M events/day, $2M saved — numbers matter",
            },
            {
              tip: "Name your stack",
              detail: "List every technology explicitly — TypeScript, PostgreSQL, Kubernetes, AWS",
            },
            {
              tip: "Clear section headers",
              detail: "Experience, Education, Skills, Projects — keeps the section detector accurate",
            },
            {
              tip: "Keep it current",
              detail: "Update after each role, project, or cert — the AI only reads what's here",
            },
            {
              tip: "Plain text only",
              detail: "No tables, columns, or special formatting — paste the raw text content",
            },
          ].map(({ tip, detail }) => (
            <div
              key={tip}
              className="rounded-[16px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-3"
            >
              <p className="text-sm font-bold">{tip}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">{detail}</p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
