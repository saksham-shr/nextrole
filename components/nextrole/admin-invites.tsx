"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import type { InviteRow } from "@/lib/db/types";

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

type SortCol = "email" | "expires" | "status";
type SortDir = "asc" | "desc";

export function AdminInvites({ initial }: { initial: InviteRow[] }) {
  const [invites, setInvites] = useState<InviteRow[]>(initial);
  const [emailInput, setEmailInput] = useState("");
  const [tier, setTier] = useState<string>("pro");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol>("expires");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchInvites = useCallback(async () => {
    const res = await fetch("/api/invites");
    if (res.ok) {
      const json = await res.json();
      setInvites(json.invites ?? []);
      setSelected(new Set());
    }
  }, []);

  const sorted = useMemo(() => {
    return [...invites].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "email") {
        cmp = a.email.localeCompare(b.email);
      } else if (sortCol === "expires") {
        const aT = a.expires_at ? new Date(a.expires_at).getTime() : 0;
        const bT = b.expires_at ? new Date(b.expires_at).getTime() : 0;
        cmp = aT - bT;
      } else if (sortCol === "status") {
        const rank = (inv: InviteRow) => (inv.used_at ? 2 : isExpired(inv.expires_at) ? 1 : 0);
        cmp = rank(a) - rank(b);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [invites, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const unusedInvites = sorted.filter((inv) => !inv.used_at);
  const allUnusedSelected =
    unusedInvites.length > 0 && unusedInvites.every((inv) => selected.has(inv.email));

  function toggleSelectAll() {
    if (allUnusedSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unusedInvites.map((inv) => inv.email)));
    }
  }

  function toggleSelect(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const emails = emailInput.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!emails.length) { setError("Enter at least one email."); return; }

    startTransition(async () => {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, tier }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to send invite."); return; }
      const tierLabel = { pro: "Pro", starter: "Starter", free: "Free" }[json.tier as string] ?? json.tier;
      setSuccess(`Invited ${json.created} email(s). They get ${tierLabel} access for 30 days on signup.`);
      setEmailInput("");
      await fetchInvites();
    });
  }

  function handleCopyLink(inv: InviteRow) {
    const link = `${window.location.origin}/signup?code=${inv.invite_code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      window.prompt("Copy invite link:", link);
    });
  }

  async function handleDelete(email: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Failed to remove invite.");
        return;
      }
      await fetchInvites();
    });
  }

  async function handleBatchDelete() {
    setError(null);
    const emails = [...selected];
    startTransition(async () => {
      const res = await fetch("/api/invites/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Batch delete failed."); return; }
      setSuccess(`Deleted ${json.deleted} invite(s).${json.skipped > 0 ? ` (${json.skipped} used — skipped)` : ""}`);
      await fetchInvites();
    });
  }

  const SortHeader = ({ col, label }: { col: SortCol; label: string }) => (
    <th
      className="border-b border-[var(--line)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)] cursor-pointer select-none hover:text-[var(--foreground)]"
      onClick={() => toggleSort(col)}
    >
      {label}{" "}
      {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : <span className="opacity-30">▼</span>}
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Send invite form */}
      <div className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Send invites</h3>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Invited emails get the chosen tier automatically when they sign up with the invite link.
        </p>
        <form onSubmit={handleSend} className="mt-4 space-y-3">
          <textarea
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={"jane@example.com\nbob@company.com"}
            rows={3}
            className="w-full rounded-[8px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--line)]"
            >
              <option value="pro">Pro (300 credits)</option>
              <option value="starter">Starter (100 credits)</option>
              <option value="free">Free (0 credits)</option>
            </select>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[#fffdf8] transition hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Send invites"}
            </button>
            <span className="text-[12px] text-[var(--muted-foreground)]">
              One email per line, or comma-separated.
            </span>
          </div>
          {error && (
            <p className="rounded-[6px] border border-[var(--bad)] bg-[#faebeb] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--bad)]">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-[6px] border border-[var(--ok)] bg-[#eef8f0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ok)]">
              {success}
            </p>
          )}
        </form>
      </div>

      {/* Invite list */}
      <div className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
            Invite list
            <span className="ml-2 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
              {invites.length}
            </span>
          </h3>
          <button
            type="button"
            onClick={() => { startTransition(async () => { await fetchInvites(); }); }}
            className="text-[12px] text-[var(--accent)] hover:underline"
          >
            Refresh
          </button>
        </div>

        {/* Batch toolbar */}
        {selected.size > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-2.5">
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={isPending}
              className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--bad)] hover:underline disabled:opacity-40"
            >
              Delete selected
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto font-mono text-[11px] text-[var(--muted-foreground)] hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {invites.length === 0 ? (
          <p className="mt-4 text-[13px] text-[var(--muted-foreground)]">No invites sent yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[8px] border border-[var(--line)]">
            <table className="min-w-full border-collapse">
              <thead className="bg-[var(--surface-soft)]">
                <tr>
                  <th className="border-b border-[var(--line)] px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={allUnusedSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                      title="Select all unused"
                    />
                  </th>
                  <SortHeader col="email" label="Email" />
                  <th className="border-b border-[var(--line)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Tier</th>
                  <th className="border-b border-[var(--line)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Code</th>
                  <SortHeader col="expires" label="Expires" />
                  <SortHeader col="status" label="Used" />
                  <th className="border-b border-[var(--line)] px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv) => {
                  const expired = isExpired(inv.expires_at);
                  const used = !!inv.used_at;
                  const isSelected = selected.has(inv.email);
                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-dashed border-[var(--line-soft)] last:border-0 ${isSelected ? "bg-[var(--surface-soft)]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        {!used && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(inv.email)}
                            className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-[var(--foreground)]">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
                          style={{
                            background: "rgba(200,74,31,0.08)",
                            border: "1px solid rgba(200,74,31,0.2)",
                            color: "var(--accent)",
                          }}
                        >
                          {inv.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--muted-foreground-2)]" title={inv.invite_code}>
                            {inv.invite_code?.slice(0, 8)}…
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv)}
                            className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--accent)] hover:underline"
                          >
                            {copiedId === inv.id ? "Copied!" : "Copy link"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">
                        {expired ? (
                          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--bad)]">Expired</span>
                        ) : (
                          formatDate(inv.expires_at)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {used ? (
                          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ok)]">
                            ✓ {formatDate(inv.used_at)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {used ? (
                          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground-2)]" title="Cannot remove a used invite">
                            —
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDelete(inv.email)}
                            disabled={isPending}
                            className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--bad)] hover:underline disabled:opacity-40"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
