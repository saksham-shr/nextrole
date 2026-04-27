"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Display,
  Eyebrow,
  InputField,
  SectionTitle,
  Surface,
} from "@/components/nextrole/ui";
import type { JobRow } from "@/lib/db/types";

// ── Types ────────────────────────────────────────────────────

interface CounterOffer {
  recommended_amount: number;
  rationale: string;
  script: string;
}

interface Batna {
  assessment: string;
  walk_away_point: string;
  alternatives: string[];
}

interface NegotiateResult {
  summary: string;
  position_strength: "strong" | "moderate" | "weak";
  counter_offer: CounterOffer;
  talking_points: string[];
  batna: Batna;
  email_draft: string;
  geo_rebuttal: string | null;
  competing_offer_leverage: string | null;
  equity_angle: string | null;
  timing_advice: string;
  risks: string[];
}

const STRENGTH_TONES: Record<string, "ok" | "warn" | "bad"> = {
  strong: "ok",
  moderate: "warn",
  weak: "bad",
};

// ── Sub-components ───────────────────────────────────────────

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Surface className="p-5">
      <SectionTitle title={title} />
      <div className="mt-1">{children}</div>
    </Surface>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="mt-0.5 shrink-0 text-[var(--accent)]">→</span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Main component ───────────────────────────────────────────

export function NegotiatePageContent({
  jobs,
  profileComp,
}: {
  jobs: JobRow[];
  profileComp: { current_comp: number | null; comp_max: number | null };
}) {
  const [result, setResult] = useState<NegotiateResult | null>(null);
  const [jobContext, setJobContext] = useState<{ title: string; company: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const body = {
      job_id: (form.get("job_id") as string) || undefined,
      offer_amount: parseFloat(form.get("offer_amount") as string),
      currency: (form.get("currency") as string) || "USD",
      competing_offer: form.get("competing_offer")
        ? parseFloat(form.get("competing_offer") as string)
        : undefined,
      location: (form.get("location") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    };

    if (!body.offer_amount || isNaN(body.offer_amount)) {
      setError("Enter a valid offer amount");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        result?: NegotiateResult;
        job?: { title: string; company: string } | null;
        error?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Request failed");
      } else if (data.result) {
        setResult(data.result);
        setJobContext(data.job ?? null);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Negotiate</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Enter your offer details and get a complete negotiation strategy — counter-offer script,
          BATNA analysis, ready-to-send email, and geo-discount rebuttals.
        </p>
      </div>

      {/* Input form */}
      <Surface className="p-6">
        <SectionTitle title="Offer details" subtitle="Fill in what you know — the more context, the stronger the strategy" />
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Job selector */}
          {jobs.length > 0 && (
            <label className="block">
              <Eyebrow className="mb-2 block">Link to a tracked job (optional)</Eyebrow>
              <select
                name="job_id"
                className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">— no linked job —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.company}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Offer amount"
              name="offer_amount"
              type="number"
              placeholder="120000"
              hint={profileComp.current_comp ? `Your current comp: ${fmt(profileComp.current_comp)}` : undefined}
            />
            <InputField
              label="Currency"
              name="currency"
              placeholder="USD"
              defaultValue="USD"
            />
            <InputField
              label="Competing offer (optional)"
              name="competing_offer"
              type="number"
              placeholder="135000"
              hint="Leave blank if you don't have one"
            />
            <InputField
              label="Location (optional)"
              name="location"
              placeholder="London, UK"
              hint="Helps rebut geographic discount arguments"
            />
          </div>

          <InputField
            label="Additional context (optional)"
            name="notes"
            textarea
            rows={3}
            placeholder="e.g. They said the band tops out at 125k. I have 3 competing offers. They want me to start in 2 weeks."
            hint={profileComp.comp_max ? `Your target comp: ${fmt(profileComp.comp_max)}` : undefined}
          />

          {error && (
            <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
              {error}
            </p>
          )}

          <Button type="submit" tone="accent" disabled={loading}>
            {loading ? "Generating strategy…" : "Generate negotiation strategy"}
          </Button>
        </form>
      </Surface>

      {/* Loading */}
      {loading && (
        <Surface className="p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Analysing your position…
          </p>
        </Surface>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Summary strip */}
          <Surface tone={STRENGTH_TONES[result.position_strength] ?? "default"} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge tone={STRENGTH_TONES[result.position_strength] ?? "default"} fill>
                    {result.position_strength} position
                  </Badge>
                  {jobContext && (
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      {jobContext.title} · {jobContext.company}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>
              <div className="shrink-0 text-right">
                <Eyebrow>Counter at</Eyebrow>
                <p className="mt-1 font-[var(--font-caveat)] text-4xl font-bold leading-none text-[var(--accent)]">
                  {fmt(result.counter_offer.recommended_amount)}
                </p>
              </div>
            </div>
          </Surface>

          {/* Counter-offer rationale + script */}
          <ResultBlock title="Counter-offer script">
            <p className="mb-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {result.counter_offer.rationale}
            </p>
            <div className="relative rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <p className="text-sm leading-relaxed">{result.counter_offer.script}</p>
              <div className="mt-3 flex justify-end">
                <CopyButton text={result.counter_offer.script} />
              </div>
            </div>
          </ResultBlock>

          {/* Talking points */}
          <ResultBlock title="Talking points">
            <BulletList items={result.talking_points} />
          </ResultBlock>

          {/* Email draft */}
          <ResultBlock title="Ready-to-send email">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                Copy and adapt — do not send verbatim.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEmailOpen(!emailOpen)}
                  className="rounded-full border border-[var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition hover:border-[var(--accent)]"
                >
                  {emailOpen ? "Collapse" : "Expand"}
                </button>
                <CopyButton text={result.email_draft} />
              </div>
            </div>
            {emailOpen && (
              <pre className="whitespace-pre-wrap rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed">
                {result.email_draft}
              </pre>
            )}
          </ResultBlock>

          {/* BATNA */}
          <ResultBlock title="BATNA — walk-away analysis">
            <p className="mb-3 text-sm leading-relaxed">{result.batna.assessment}</p>
            <div className="mb-3 rounded-[14px] border border-[var(--warn)] bg-[#faf2df] px-4 py-3">
              <Eyebrow className="mb-1">Walk-away point</Eyebrow>
              <p className="text-sm font-bold">{result.batna.walk_away_point}</p>
            </div>
            {result.batna.alternatives.length > 0 && (
              <>
                <Eyebrow className="mb-2">If they say no</Eyebrow>
                <BulletList items={result.batna.alternatives} />
              </>
            )}
          </ResultBlock>

          {/* Conditional sections */}
          {result.competing_offer_leverage && (
            <ResultBlock title="Competing offer leverage">
              <p className="text-sm leading-relaxed">{result.competing_offer_leverage}</p>
            </ResultBlock>
          )}

          {result.geo_rebuttal && (
            <ResultBlock title="Geographic discount rebuttal">
              <p className="text-sm leading-relaxed">{result.geo_rebuttal}</p>
            </ResultBlock>
          )}

          {result.equity_angle && (
            <ResultBlock title="Equity & RSU angle">
              <p className="text-sm leading-relaxed">{result.equity_angle}</p>
            </ResultBlock>
          )}

          {/* Timing + risks */}
          <div className="grid gap-5 sm:grid-cols-2">
            <ResultBlock title="Timing advice">
              <p className="text-sm leading-relaxed">{result.timing_advice}</p>
            </ResultBlock>

            <ResultBlock title="Risks to watch">
              <BulletList items={result.risks} />
            </ResultBlock>
          </div>
        </div>
      )}
    </div>
  );
}
