"use client";

import {
  Badge,
  Button,
  Display,
  Eyebrow,
  StatCard,
  Surface,
  SectionTitle,
  Timeline,
} from "@/components/nextrole/ui";

type FunnelStep = { label: string; count: number };
type ArchetypeStat = { archetype: string; count: number; avg_score: number | null; applied: number };
type SourceStat = { source: string; count: number };
type Recommendation = { title: string; body: string };

export function PatternsPageContent({
  funnel,
  archetypeStats,
  sourceStats,
  avgScore,
  totalEvaluated,
  conversionRate,
  recommendations,
}: {
  funnel: FunnelStep[];
  archetypeStats: ArchetypeStat[];
  sourceStats: SourceStat[];
  avgScore: number | null;
  totalEvaluated: number;
  conversionRate: number | null;
  recommendations: Recommendation[];
}) {
  const hasData = funnel.some((f) => f.count > 0);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Patterns</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Funnel analytics, archetype performance, and sourcing intelligence across your full search history.
        </p>
      </div>

      {!hasData && (
        <Surface className="border-dashed p-8 text-center">
          <p className="text-lg font-bold">No data yet</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted-foreground)]">
            Add jobs, run evaluations, and start applying — patterns will appear as your pipeline grows.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button tone="accent" href="/dashboard/pipeline">Add to pipeline</Button>
          </div>
        </Surface>
      )}

      {hasData && (
        <>
          {/* Funnel */}
          <div>
            <Eyebrow className="mb-3">Application funnel</Eyebrow>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {funnel.map((step, i) => (
                <StatCard
                  key={step.label}
                  label={step.label}
                  value={String(step.count)}
                  tone={i === 0 ? "default" : i === funnel.length - 1 ? "ok" : "default"}
                />
              ))}
            </div>
          </div>

          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Surface className="p-5">
              <Eyebrow>Avg eval score</Eyebrow>
              <p className="mt-2 font-[var(--font-caveat)] text-4xl font-bold">
                {avgScore !== null ? avgScore.toFixed(1) : "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                across {totalEvaluated} evaluated
              </p>
            </Surface>
            <Surface className="p-5">
              <Eyebrow>Eval → apply rate</Eyebrow>
              <p className="mt-2 font-[var(--font-caveat)] text-4xl font-bold">
                {conversionRate !== null ? `${Math.round(conversionRate)}%` : "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                of evaluated roles applied to
              </p>
            </Surface>
            <Surface className="p-5">
              <Eyebrow>Active archetypes</Eyebrow>
              <p className="mt-2 font-[var(--font-caveat)] text-4xl font-bold">
                {archetypeStats.length}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                distinct role types tracked
              </p>
            </Surface>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Archetype breakdown */}
            <Surface className="p-5">
              <SectionTitle
                title="By archetype"
                subtitle="Role types ranked by volume and score"
              />
              {archetypeStats.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No archetype data yet.</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr>
                        {["Archetype", "Jobs", "Avg score", "Applied"].map((col) => (
                          <th key={col} className="border-b border-[var(--line)] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {archetypeStats.map((a) => (
                        <tr key={a.archetype} className="border-b border-dashed border-[var(--line-soft)] last:border-b-0">
                          <td className="px-3 py-2 text-sm font-bold">{a.archetype}</td>
                          <td className="px-3 py-2 text-sm">{a.count}</td>
                          <td className="px-3 py-2">
                            {a.avg_score !== null ? (
                              <Badge tone={a.avg_score >= 4 ? "ok" : a.avg_score >= 3 ? "warn" : "bad"}>
                                {a.avg_score.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm">{a.applied}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Surface>

            {/* Source breakdown */}
            <div className="space-y-5">
              <Surface className="p-5">
                <SectionTitle title="By source" subtitle="Where your jobs are coming from" />
                {sourceStats.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No source data yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {sourceStats.map((s) => (
                      <div key={s.source} className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0">
                        <p className="text-sm font-mono uppercase tracking-[0.14em]">{s.source ?? "unknown"}</p>
                        <Badge>{s.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Surface>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <Surface tone="accent" className="p-5">
                  <SectionTitle title="Recommendations" subtitle="Based on your search data" />
                  <Timeline
                    items={recommendations.map((r) => ({
                      title: r.title,
                      subtitle: r.body,
                    }))}
                  />
                </Surface>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
