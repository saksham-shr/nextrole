"use client";

import { useState, useCallback, useTransition } from "react";
import type { InviteRow } from "@/lib/db/types";

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function AdminInvites({ initial }: { initial: InviteRow[] }) {
  const [invites, setInvites] = useState<InviteRow[]>(initial);
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchInvites = useCallback(async () => {
    const res = await fetch("/api/invites");
    if (res.ok) {
      const json = await res.json();
      setInvites(json.invites ?? []);
    }
  }, []);

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
        body: JSON.stringify({ emails, tier: "pro" }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to send invite."); return; }
      setSuccess(`Invited ${json.created} email(s). They get Pro access for 30 days on signup.`);
      setEmailInput("");
      await fetchInvites();
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
      if (!res.ok) { setError("Failed to remove invite."); return; }
      await fetchInvites();
    });
  }

  return (
    <div className="space-y-6">
      {/* Send invite form */}
      <div
        className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface)] p-5"
      >
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Send invites</h3>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Invited emails get Pro tier access for 30 days automatically when they sign up.
        </p>
        <form onSubmit={handleSend} className="mt-4 space-y-3">
          <textarea
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={"jane@example.com\nbob@company.com"}
            rows={3}
            className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
          />
          <div className="flex items-center gap-3">
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
            <p className="rounded-[6px] border border-[var(--bad)] bg-[#faebeb] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--bad)]">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-[6px] border border-[var(--ok)] bg-[#eef8f0] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ok)]">
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

        {invites.length === 0 ? (
          <p className="mt-4 text-[13px] text-[var(--muted-foreground)]">No invites sent yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[8px] border border-[var(--line)]">
            <table className="min-w-full border-collapse">
              <thead className="bg-[var(--surface-soft)]">
                <tr>
                  {["Email", "Tier", "Expires", "Used", ""].map((h) => (
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
                {invites.map((inv) => {
                  const expired = isExpired(inv.expires_at);
                  const used = !!inv.used_at;
                  return (
                    <tr key={inv.id} className="border-b border-dashed border-[var(--line-soft)] last:border-0">
                      <td className="px-4 py-3 text-[13px] font-medium text-[var(--foreground)]">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]"
                          style={{
                            background: "rgba(200,74,31,0.08)",
                            border: "1px solid rgba(200,74,31,0.2)",
                            color: "var(--accent)",
                          }}
                        >
                          {inv.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">
                        {expired ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bad)]">Expired</span>
                        ) : (
                          formatDate(inv.expires_at)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {used ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ok)]">
                            ✓ {formatDate(inv.used_at)}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.email)}
                          disabled={isPending}
                          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bad)] hover:underline disabled:opacity-40"
                        >
                          Remove
                        </button>
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
