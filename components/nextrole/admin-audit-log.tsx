"use client";

import { useMemo, useState } from "react";
import type { AdminAuditLogRow } from "@/lib/db/types";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const ACTION_LABEL: Record<string, string> = {
  grant_tier:          "Grant tier",
  reset_credits:       "Reset credits",
  delete_user:         "Delete user",
  invite_create:       "Create invite",
  invite_delete:       "Delete invite",
  invite_batch_delete: "Batch delete invites",
  commerce_update:     "Update commerce config",
};

const ACTION_TONE: Record<string, string> = {
  grant_tier:          "var(--accent)",
  reset_credits:       "var(--warn)",
  delete_user:         "var(--bad)",
  invite_create:       "var(--ok)",
  invite_delete:       "var(--muted-foreground)",
  invite_batch_delete: "var(--bad)",
  commerce_update:     "var(--accent)",
};

export function AdminAuditLog({ rows }: { rows: AdminAuditLogRow[] }) {
  const [filter, setFilter] = useState<string>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const actions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = filter === "All" ? rows : rows.filter((r) => r.action === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`rounded-[6px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
              filter === a
                ? "bg-[var(--surface)] border border-[var(--line)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {a === "All" ? a : ACTION_LABEL[a] ?? a}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-[var(--muted-foreground)]">
          {filtered.length} entries
        </span>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[var(--line)]">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--surface-soft)]">
            <tr>
              {["When", "Actor", "Action", "Target", ""].map((h) => (
                <th
                  key={h}
                  className="border-b border-[var(--line)] px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[var(--muted-foreground)]">
                  No audit entries yet.
                </td>
              </tr>
            ) : filtered.map((r) => {
              const isExpanded = expanded === r.id;
              return (
                <>
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-dashed border-[var(--line-soft)] last:border-0 hover:bg-[var(--surface-soft)]"
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-[13px] font-medium">{r.actor_email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-[11px] uppercase tracking-[0.14em]"
                        style={{ color: ACTION_TONE[r.action] ?? "var(--foreground)" }}
                      >
                        {ACTION_LABEL[r.action] ?? r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                        {r.target_type}{r.target_id ? `:${r.target_id.slice(0, 40)}${r.target_id.length > 40 ? "…" : ""}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.id}-detail`} className="bg-[var(--surface-soft)]">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <DetailBlock label="Before" data={r.before} />
                          <DetailBlock label="After" data={r.after} />
                          {r.metadata && <DetailBlock label="Metadata" data={r.metadata} className="sm:col-span-2" />}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailBlock({ label, data, className = "" }: { label: string; data: unknown; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </div>
      <pre className="overflow-auto rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] p-3 font-mono text-[11px] text-[var(--foreground)]">
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}
