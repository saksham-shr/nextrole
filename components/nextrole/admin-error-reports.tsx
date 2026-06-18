"use client";

import { useState } from "react";

export interface ErrorReportRow {
  id: string;
  user_id: string | null;
  error_message: string;
  page_url: string | null;
  component: string | null;
  user_agent: string | null;
  extra_context: Record<string, unknown>;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_COLOR: Record<string, string> = {
  open:      "var(--bad)",
  resolved:  "var(--ok)",
  dismissed: "var(--muted-foreground)",
};

export function AdminErrorReports({ initial }: { initial: ErrorReportRow[] }) {
  const [reports, setReports] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("open");

  async function updateStatus(id: string, status: "resolved" | "dismissed") {
    setLoading(id);
    try {
      const res = await fetch("/api/admin/error-report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed");
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch {
      // silent — row stays unchanged
    } finally {
      setLoading(null);
    }
  }

  const visible = reports.filter((r) => filter === "all" || r.status === filter);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["open", "resolved", "dismissed", "all"] as const).map((f) => {
          const count = f === "all" ? reports.length : reports.filter((r) => r.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition"
              style={{
                background: filter === f ? "var(--surface)" : "transparent",
                border: filter === f ? "1px solid var(--line-soft)" : "1px solid transparent",
                color: filter === f ? "var(--foreground)" : "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="py-8 text-center text-[13px] text-[var(--muted-foreground)]">No reports</p>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)]"
            style={{ borderLeft: `3px solid ${STATUS_COLOR[r.status]}` }}
          >
            {/* Row header */}
            <div
              className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3"
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--foreground)]">
                  {r.error_message}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted-foreground)]">
                  <span>{formatDate(r.created_at)}</span>
                  {r.user_id && <span>User: {r.user_id.slice(0, 8)}…</span>}
                  {r.component && <span>Component: {r.component}</span>}
                  {r.page_url && <span className="truncate max-w-[240px]">{r.page_url.replace(/^https?:\/\/[^/]+/, "")}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: `${STATUS_COLOR[r.status]}22`, color: STATUS_COLOR[r.status] }}
                >
                  {r.status}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--muted-foreground)" strokeWidth="2"
                  style={{ transform: expanded === r.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === r.id && (
              <div className="border-t border-[var(--line-soft)] px-4 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {r.page_url && (
                    <Detail label="Page URL" value={r.page_url} />
                  )}
                  {r.user_agent && (
                    <Detail label="User Agent" value={r.user_agent} className="sm:col-span-2" />
                  )}
                  {r.user_id && (
                    <Detail label="User ID" value={r.user_id} />
                  )}
                  {Object.keys(r.extra_context ?? {}).length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Extra context</p>
                      <pre className="overflow-x-auto rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-[11px] text-[var(--foreground)]">
                        {JSON.stringify(r.extra_context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {r.status === "open" && (
                  <div className="mt-3 flex gap-2">
                    <ActionBtn
                      label="Mark resolved"
                      tone="ok"
                      disabled={loading === r.id}
                      onClick={() => updateStatus(r.id, "resolved")}
                    />
                    <ActionBtn
                      label="Dismiss"
                      tone="muted"
                      disabled={loading === r.id}
                      onClick={() => updateStatus(r.id, "dismissed")}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{label}</p>
      <p className="break-all text-[12px] text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function ActionBtn({ label, tone, disabled, onClick }: { label: string; tone: "ok" | "muted"; disabled: boolean; onClick: () => void }) {
  const color = tone === "ok" ? "var(--ok)" : "var(--muted-foreground)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: "4px 12px",
        borderRadius: 6,
        border: `1px solid ${color}44`,
        background: `${color}11`,
        color,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {label}
    </button>
  );
}
