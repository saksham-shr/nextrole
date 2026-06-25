"use client";

import { useState, useTransition, useMemo } from "react";
import { addJobFromExplore } from "@/app/actions/explore";

type JobCard = {
  title: string;
  company: string;
  url: string | null;
  description: string;
  archetype: string | null;
  trackers: number;
  alreadyAdded: boolean;
  relevanceScore: number;
};

type SortKey = "relevance" | "popular" | "newest";

function CompanyLogo({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name || "?").charAt(0);
  const colors = [
    { bg: "rgba(31,78,200,0.1)", fg: "#1f4ec8" },
    { bg: "rgba(47,122,58,0.1)", fg: "#2f7a3a" },
    { bg: "rgba(176,115,19,0.1)", fg: "#b07313" },
    { bg: "rgba(200,74,31,0.1)", fg: "#c84a1f" },
    { bg: "rgba(106,99,88,0.12)", fg: "#6b6358" },
    { bg: "rgba(136,80,180,0.1)", fg: "#7140a3" },
  ];
  const c = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.18),
        background: c.bg, color: c.fg,
        fontFamily: "var(--font-mono-stack)",
        fontWeight: 500,
        fontSize: Math.round(size * 0.42),
        border: `1px solid ${c.fg}33`,
      }}
    >
      {initial}
    </div>
  );
}

function JobCardRow({ job }: { job: JobCard }) {
  const [added, setAdded] = useState(job.alreadyAdded);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await addJobFromExplore({
        title: job.title,
        company: job.company,
        url: job.url,
        description: job.description,
        archetype: job.archetype,
      });
      if ("error" in result) {
        setErr(result.error);
      } else {
        setAdded(true);
        setErr(null);
      }
    });
  }

  return (
    <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] p-4 flex flex-col gap-3 hover:border-[var(--line)] transition-colors">
      <div className="flex items-start gap-3">
        <CompanyLogo name={job.company} size={36} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[14px] leading-tight truncate">{job.title}</div>
          <div className="text-[12px] text-[var(--muted-foreground)] truncate mt-0.5">
            {job.company}
            {job.archetype && (
              <span className="ml-1.5 opacity-70">· {job.archetype}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--line-soft)] px-2.5 py-1 text-[12px] text-[var(--muted-foreground)] transition-colors hover:border-[var(--line)] hover:text-[var(--foreground)]"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              View
            </a>
          )}
          <button
            onClick={handleAdd}
            disabled={added || pending}
            className={
              added
                ? "inline-flex items-center gap-1.5 rounded-[5px] border border-[var(--ok)] px-3 py-1 text-[12px] font-medium text-[var(--ok)] cursor-default"
                : "inline-flex items-center gap-1.5 rounded-[5px] bg-[var(--accent)] px-3 py-1 text-[12px] font-medium text-[#fffdf8] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            }
          >
            {added ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Added
              </>
            ) : pending ? "Adding…" : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-3">
        {job.description}
      </p>

      <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground-2)]">
        <span className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {job.trackers} {job.trackers === 1 ? "person" : "people"} tracking
        </span>
        {job.relevanceScore > 0 && (
          <span className="flex items-center gap-1 text-[var(--accent)]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Matches your profile
          </span>
        )}
        {err && <span className="ml-auto text-[var(--bad)]">{err}</span>}
      </div>
    </div>
  );
}

export function ExplorePageContent({
  jobs,
  targetRoles,
  targetArchetypes,
}: {
  jobs: JobCard[];
  targetRoles: string[];
  targetArchetypes: string[];
}) {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [archetypeFilter, setArchetypeFilter] = useState<string>("all");

  const allArchetypes = useMemo(() => {
    const s = new Set<string>();
    for (const j of jobs) if (j.archetype) s.add(j.archetype);
    return Array.from(s).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    let list = jobs;

    if (q.trim()) {
      const qLow = q.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(qLow) ||
          j.company.toLowerCase().includes(qLow),
      );
    }

    if (archetypeFilter !== "all") {
      list = list.filter((j) => j.archetype === archetypeFilter);
    }

    const sorted = [...list];
    if (sortBy === "relevance") {
      sorted.sort((a, b) => b.relevanceScore - a.relevanceScore || b.trackers - a.trackers);
    } else if (sortBy === "popular") {
      sorted.sort((a, b) => b.trackers - a.trackers);
    }
    // "newest" keeps server order (already sorted by created_at desc after dedup)

    return sorted;
  }, [jobs, q, sortBy, archetypeFilter]);

  const hasTargetProfile = targetRoles.length > 0 || targetArchetypes.length > 0;

  return (
    <div className="max-w-[960px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <div
          className="uppercase text-[var(--muted-foreground)]"
          style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}
        >
          Explore
        </div>
        <h1 style={{ fontSize: 26, letterSpacing: "-0.02em", fontWeight: 600 }}>
          Community jobs{" "}
          <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>· {filtered.length}</span>
        </h1>
        <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
          {hasTargetProfile
            ? `Showing jobs added in the last 10 days, ranked by match to your target roles.`
            : `Showing jobs added in the last 10 days. Set target roles in your profile to see ranked results.`}
        </p>
      </div>

      {/* Target role chips (if set) */}
      {targetRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-[var(--muted-foreground)] self-center mr-1">Matching:</span>
          {targetRoles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-muted)" }}
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[380px]">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search title or company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-[7px] border border-[var(--line-soft)] bg-[var(--surface)] pl-9 pr-4 py-2 text-[13px] outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Archetype filter */}
        {allArchetypes.length > 0 && (
          <select
            value={archetypeFilter}
            onChange={(e) => setArchetypeFilter(e.target.value)}
            className="rounded-[7px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]"
          >
            <option value="all">All archetypes</option>
            {allArchetypes.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}

        {/* Sort */}
        <div className="flex rounded-[7px] border border-[var(--line-soft)] overflow-hidden text-[12px]">
          {(["relevance", "popular", "newest"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className="px-3 py-2 transition-colors"
              style={{
                background: sortBy === k ? "var(--surface-soft)" : "var(--surface)",
                color: sortBy === k ? "var(--foreground)" : "var(--muted-foreground)",
                fontWeight: sortBy === k ? 500 : 400,
                borderRight: k !== "newest" ? "1px solid var(--line-soft)" : undefined,
              }}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] p-12 text-center">
          <div className="text-[32px] mb-3">🔍</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">
            {q || archetypeFilter !== "all"
              ? "No jobs match your filters."
              : "No community jobs in the last 10 days yet — check back soon or install the extension to add some!"}
          </p>
          {!hasTargetProfile && jobs.length === 0 && (
            <p className="text-[12px] text-[var(--muted-foreground-2)] mt-2">
              Set your target roles in{" "}
              <a href="/dashboard/profile" className="underline hover:text-[var(--foreground)]">your profile</a>{" "}
              to see ranked results.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((job, i) => (
            <JobCardRow key={`${job.title}|||${job.company}|||${i}`} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
