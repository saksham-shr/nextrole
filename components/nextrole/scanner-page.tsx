"use client";

import { useState, useMemo } from "react";
import {
  Badge,
  Button,
  Display,
  EmptyState,
  Eyebrow,
  StatCard,
  Surface,
  SectionTitle,
} from "@/components/nextrole/ui";
import { addScanSource, deleteScanSource, addPortalFromLibrary } from "@/app/actions/scanner";
import type { ScanSourceRow, ScanRunRow } from "@/lib/db/types";
import type { ScanResult } from "@/app/api/scan/route";
import {
  PORTALS,
  PORTAL_CATEGORIES,
  searchPortals,
  type Portal,
  type PortalCategory,
} from "@/lib/scanner/portals";
import {
  COMPANIES,
  COMPANY_CATEGORIES,
  searchCompanies,
  type CompanyPortal,
  type CompanyCategory,
} from "@/lib/scanner/companies";

export type SourceWithLatestRun = ScanSourceRow & {
  scan_runs: ScanRunRow[];
};

type Tab = "my_sources" | "portal_library" | "company_library";

const TYPE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  lever: "Lever",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
  bamboohr: "BambooHR",
  icims: "iCIMS",
  linkedin: "LinkedIn",
  indeed: "Indeed",
  wellfound: "Wellfound",
  yc: "Y Combinator",
  custom: "Custom",
};

const TYPE_TONES: Record<string, "ok" | "accent" | "warn" | "default"> = {
  greenhouse: "ok",
  ashby: "accent",
  lever: "warn",
  wellfound: "accent",
  yc: "accent",
  linkedin: "ok",
  custom: "default",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Portal library panel ─────────────────────────────────────

function PortalLibrary({ enabledUrls, onAdd }: { enabledUrls: Set<string>; onAdd: (p: Portal) => void }) {
  const [category, setCategory] = useState<PortalCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const base = query.trim() ? searchPortals(query) : PORTALS;
    return category === "all" ? base : base.filter((p) => p.category === category);
  }, [category, query]);

  async function handleAdd(portal: Portal) {
    setAdding(portal.id);
    setErrors((prev) => ({ ...prev, [portal.id]: "" }));
    const result = await addPortalFromLibrary(portal.id, portal.name, portal.url);
    if (result.error && result.error !== "Already added") {
      setErrors((prev) => ({ ...prev, [portal.id]: result.error! }));
    } else {
      onAdd(portal);
    }
    setAdding(null);
  }

  return (
    <div className="space-y-4">
      {/* Search + category filter */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search portals…"
          className="min-w-[200px] flex-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
            category === "all"
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)]"
          }`}
        >
          All ({PORTALS.length})
        </button>
        {PORTAL_CATEGORIES.map((cat) => {
          const count = PORTALS.filter((p) => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                category === cat.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)]"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Portal grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((portal) => {
          const isEnabled = enabledUrls.has(portal.url);
          const isAdding = adding === portal.id;
          const err = errors[portal.id];

          return (
            <div
              key={portal.id}
              className={`rounded-[18px] border p-4 transition ${
                isEnabled
                  ? "border-[var(--ok)] bg-[#eef8f0]"
                  : "border-[var(--line)] bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{portal.name}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {portal.category}
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {portal.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {portal.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[9px] text-[var(--muted-foreground)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {err && <p className="mt-2 text-xs text-[var(--bad)]">{err}</p>}
              <div className="mt-3">
                {isEnabled ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ok)]">
                    ✓ Added to sources
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(portal)}
                    disabled={isAdding}
                    className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isAdding ? "Adding…" : "Add to scanner"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          No portals match "{query}"
        </p>
      )}
    </div>
  );
}

// ── Company career page library panel ───────────────────────

function CompanyLibrary({ enabledUrls, onAdd }: { enabledUrls: Set<string>; onAdd: (c: CompanyPortal) => void }) {
  const [category, setCategory] = useState<CompanyCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const base = query.trim() ? searchCompanies(query) : COMPANIES;
    return category === "all" ? base : base.filter((c) => c.category === category);
  }, [category, query]);

  async function handleAdd(company: CompanyPortal) {
    setAdding(company.id);
    setErrors((prev) => ({ ...prev, [company.id]: "" }));
    const result = await addPortalFromLibrary(company.id, company.name, company.url);
    if (result.error && result.error !== "Already added") {
      setErrors((prev) => ({ ...prev, [company.id]: result.error! }));
    } else {
      onAdd(company);
    }
    setAdding(null);
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          className="min-w-[200px] flex-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
            category === "all"
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)]"
          }`}
        >
          All ({COMPANIES.length})
        </button>
        {COMPANY_CATEGORIES.map((cat) => {
          const count = COMPANIES.filter((c) => c.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                category === cat.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)]"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Company grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((company) => {
          const isEnabled = enabledUrls.has(company.url);
          const isAdding = adding === company.id;
          const err = errors[company.id];

          return (
            <div
              key={company.id}
              className={`rounded-[18px] border p-4 transition ${
                isEnabled
                  ? "border-[var(--ok)] bg-[#eef8f0]"
                  : "border-[var(--line)] bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{company.name}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {COMPANY_CATEGORIES.find((c) => c.id === company.category)?.label ?? company.category}
                    {company.ats ? ` · ${company.ats}` : ""}
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {company.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {company.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[9px] text-[var(--muted-foreground)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {err && <p className="mt-2 text-xs text-[var(--bad)]">{err}</p>}
              <div className="mt-3">
                {isEnabled ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ok)]">
                    ✓ Added to sources
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(company)}
                    disabled={isAdding}
                    className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isAdding ? "Adding…" : "Add to scanner"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          No companies match "{query}"
        </p>
      )}
    </div>
  );
}

// ── Main scanner component ───────────────────────────────────

export function ScannerPageContent({
  sources: initialSources,
  error: pageError,
  message: pageMessage,
}: {
  sources: SourceWithLatestRun[];
  error?: string;
  message?: string;
}) {
  const [tab, setTab] = useState<Tab>("my_sources");
  const [sources, setSources] = useState(initialSources);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});

  const enabledUrls = useMemo(() => new Set(sources.map((s) => s.url)), [sources]);

  const totalDiscovered = sources.reduce((s, src) => s + src.total_discovered, 0);
  const lastScan = sources.map((s) => s.last_scanned_at).filter(Boolean).sort().at(-1);

  async function runScan(sourceId: string) {
    setScanningId(sourceId);
    setScanError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId }),
      });
      const data = (await res.json()) as ScanResult;
      if (!res.ok || data.error) {
        setScanError(data.error ?? "Scan failed");
      } else {
        setScanResults((prev) => ({ ...prev, [sourceId]: data }));
      }
    } catch {
      setScanError("Network error — please try again");
    } finally {
      setScanningId(null);
    }
  }

  function handlePortalAdded(portal: Portal | CompanyPortal) {
    // Optimistically add a placeholder so the UI shows "Added" immediately
    // The real row will appear on next page load
    setSources((prev) => [
      ...prev,
      {
        id: `__tmp_${portal.id}`,
        user_id: "",
        name: portal.name,
        url: portal.url,
        type: portal.category,
        is_active: true,
        last_scanned_at: null,
        total_discovered: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scan_runs: [],
      } as SourceWithLatestRun,
    ]);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Scanner</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Browse 50+ curated job boards and 50+ specific company career pages, or add any URL. Every source is saved permanently and can be scanned on demand.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="My sources" value={String(sources.length)} sublabel="configured" />
        <StatCard label="Job boards" value={String(PORTALS.length)} sublabel="in portal library" />
        <StatCard label="Companies" value={String(COMPANIES.length)} sublabel="career pages" />
        <StatCard
          label="Total discovered"
          value={String(totalDiscovered)}
          sublabel="added to pipeline"
          tone={totalDiscovered > 0 ? "ok" : "default"}
        />
        <StatCard
          label="Last scan"
          value={lastScan ? timeAgo(lastScan) : "—"}
          sublabel="most recent run"
        />
      </div>

      {/* Alerts */}
      {pageError && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">{pageError}</p>
      )}
      {pageMessage && (
        <p className="rounded-[14px] border border-[var(--ok)] bg-[#eef8f0] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ok)]">{pageMessage}</p>
      )}
      {scanError && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">{scanError}</p>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-[var(--line)] pb-0">
        {(["my_sources", "portal_library", "company_library"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-[14px] border border-b-0 px-5 py-2.5 text-sm font-bold transition ${
              tab === t
                ? "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "my_sources"
              ? `My Sources (${sources.length})`
              : t === "portal_library"
              ? `Job Boards (${PORTALS.length})`
              : `Companies (${COMPANIES.length})`}
          </button>
        ))}
      </div>

      {/* ── My Sources tab ── */}
      {tab === "my_sources" && (
        <div className="space-y-6">
          {/* Add custom URL */}
          <Surface className="p-5">
            <SectionTitle title="Add custom URL" subtitle="Any career page or job board — greenhouse, ashby, lever, or plain URL" />
            <form action={addScanSource} className="flex flex-wrap gap-3">
              <input
                name="name"
                placeholder="e.g. Anthropic careers"
                required
                className="min-w-[180px] flex-1 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
              <input
                name="url"
                type="url"
                placeholder="https://boards.greenhouse.io/anthropic"
                required
                className="min-w-[280px] flex-1 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
              <Button type="submit" tone="accent">Add source</Button>
            </form>
          </Surface>

          {/* Sources list */}
          {sources.length === 0 ? (
            <EmptyState
              title="No sources yet"
              body="Add a custom URL above, or browse the Portal Library tab to enable pre-configured boards."
              action={<Button tone="accent" onClick={() => setTab("portal_library")}>Browse portal library</Button>}
            />
          ) : (
            <div className="space-y-4">
              {sources.map((src) => {
                const isTmp = src.id.startsWith("__tmp_");
                const isScanning = scanningId === src.id;
                const result = scanResults[src.id];
                const latestRun = src.scan_runs[0];

                return (
                  <Surface key={src.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Badge tone={TYPE_TONES[src.type] ?? "default"}>
                          {TYPE_LABELS[src.type] ?? src.type}
                        </Badge>
                        <div>
                          <p className="font-semibold">{src.name}</p>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 block font-mono text-[10px] text-[var(--muted-foreground)] hover:underline break-all"
                          >
                            {src.url}
                          </a>
                          <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-[var(--muted-foreground)]">
                            <span>Last scan: {timeAgo(src.last_scanned_at)}</span>
                            <span>{src.total_discovered} added total</span>
                            {latestRun && (
                              <span>Last run: {latestRun.added_count} new, {latestRun.duplicate_count} dupes</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isTmp && (
                          <Button tone="accent" onClick={() => runScan(src.id)} disabled={!!scanningId}>
                            {isScanning ? "Scanning…" : "Scan now"}
                          </Button>
                        )}
                        {isTmp ? (
                          <span className="font-mono text-[10px] text-[var(--muted-foreground)]">Saving…</span>
                        ) : (
                          <form action={deleteScanSource}>
                            <input type="hidden" name="source_id" value={src.id} />
                            <Button type="submit" tone="default" ghost>Remove</Button>
                          </form>
                        )}
                      </div>
                    </div>

                    {isScanning && (
                      <div className="mt-4 flex items-center gap-3 border-t border-dashed border-[var(--line-soft)] pt-4">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                          Fetching page and extracting listings…
                        </p>
                      </div>
                    )}

                    {result && (
                      <div className="mt-4 border-t border-dashed border-[var(--line-soft)] pt-4">
                        <div className="mb-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-widest">
                          <span className="text-[var(--ok)]">{result.added} new → pipeline</span>
                          <span className="text-[var(--muted-foreground)]">{result.duplicates} duplicates skipped</span>
                          <span className="text-[var(--muted-foreground)]">{result.discovered} total found</span>
                        </div>
                        {result.discoveries.length > 0 && (
                          <div className="space-y-2">
                            {result.discoveries.map((d) => (
                              <div
                                key={d.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3 py-2"
                              >
                                <div>
                                  <p className="text-xs font-medium">{d.title}</p>
                                  <p className="text-[10px] text-[var(--muted-foreground)]">
                                    {d.company}{d.location ? ` · ${d.location}` : ""}{d.department ? ` · ${d.department}` : ""}
                                  </p>
                                </div>
                                <Badge tone={d.status === "added" ? "ok" : "default"}>
                                  {d.status === "added" ? "added" : "duplicate"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {result.added > 0 && (
                          <div className="mt-3">
                            <Button href="/dashboard/pipeline" ghost>View in pipeline →</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Surface>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Portal Library tab ── */}
      {tab === "portal_library" && (
        <div className="space-y-4">
          <Surface className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Browse {PORTALS.length} pre-configured job boards (Greenhouse, Ashby, Lever, LinkedIn, Wellfound…). Click <strong>Add to scanner</strong> to add permanently — it will appear in My Sources and stay there across sessions.
            </p>
          </Surface>
          <PortalLibrary enabledUrls={enabledUrls} onAdd={handlePortalAdded} />
        </div>
      )}

      {/* ── Company Library tab ── */}
      {tab === "company_library" && (
        <div className="space-y-4">
          <Surface className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Browse {COMPANIES.length} specific company career pages — AI labs, developer tools, fintech, enterprise, and more. Click <strong>Add to scanner</strong> to track that company&apos;s jobs directly.
            </p>
          </Surface>
          <CompanyLibrary enabledUrls={enabledUrls} onAdd={handlePortalAdded} />
        </div>
      )}
    </div>
  );
}
