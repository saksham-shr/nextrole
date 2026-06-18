"use client";

import { useMemo, useState, useTransition } from "react";
import { grantTier, resetCredits } from "@/app/actions/admin";
import { AdminDeleteButton } from "@/components/nextrole/admin-delete-button";
import type { UserTier } from "@/lib/db/types";

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  tier: UserTier;
  credits: number;
  subscriptionEndsAt: string | null;
  referredBy?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function tierBadge(tier: UserTier) {
  const map: Partial<Record<UserTier, { bg: string; fg: string }>> = {
    pro:     { bg: "rgba(47,122,58,0.1)",  fg: "#2f7a3a" },
    starter: { bg: "rgba(31,78,200,0.1)",  fg: "#1f4ec8" },
    free:    { bg: "rgba(106,99,88,0.12)", fg: "#6b6358" },
  };
  const c = map[tier] ?? map.free!;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.fg}33` }}
    >
      {tier}
    </span>
  );
}

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
          className="w-full max-w-xs rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
        />
        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
          {filtered.length} of {users.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[var(--line)]">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--surface-soft)]">
            <tr>
              {["Email", "Tier", "Credits", "Referred by", "Signed up", "Last seen", ""].map((h) => (
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
                <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-[var(--muted-foreground)]">
                  No users match this search.
                </td>
              </tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="border-b border-dashed border-[var(--line-soft)] last:border-0">
                <td className="px-4 py-3 text-[13px] font-medium">{u.email}</td>
                <td className="px-4 py-3">{tierBadge(u.tier)}</td>
                <td className="px-4 py-3 font-mono text-[12px]">{u.credits}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-[var(--muted-foreground)]">{u.referredBy ?? "—"}</td>
                <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-[12px] text-[var(--muted-foreground)]">{formatDate(u.lastSignInAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(u)}
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] hover:underline"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <UserActionsModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function UserActionsModal({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const [tier, setTier] = useState<UserTier>(user.tier);
  const [duration, setDuration] = useState<number>(30);
  const [credits, setCredits] = useState<string>(String(user.credits));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGrantTier() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await grantTier(user.id, tier, duration);
      if (res?.error) setError(res.error);
      else setSuccess(`Granted ${tier} for ${duration} days.`);
    });
  }

  function handleResetCredits() {
    setError(null);
    setSuccess(null);
    const n = parseInt(credits, 10);
    if (isNaN(n)) { setError("Credits must be a number"); return; }
    startTransition(async () => {
      const res = await resetCredits(user.id, n);
      if (res?.error) setError(res.error);
      else setSuccess(`Credits set to ${n}.`);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[12px] border border-[var(--line)] bg-[var(--background)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">{user.email}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
              {user.id.slice(0, 8)}… · {user.tier} · {user.credits} credits
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            ✕
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-[6px] border border-[var(--bad)] bg-[#faebeb] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--bad)]">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-[6px] border border-[var(--ok)] bg-[#eef8f0] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ok)]">
            {success}
          </p>
        )}

        {/* Grant tier */}
        <div className="mt-5 space-y-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Grant tier
          </h3>
          <div className="flex gap-2">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as UserTier)}
              className="rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]"
            >
              <option value="pro">Pro</option>
              <option value="starter">Starter</option>
              <option value="free">Free</option>
            </select>
            <input
              type="number"
              min={1}
              max={365}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
              className="w-24 rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]"
            />
            <span className="self-center text-[12px] text-[var(--muted-foreground)]">days</span>
            <button
              onClick={handleGrantTier}
              disabled={isPending}
              className="ml-auto rounded-[6px] bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-[#fffdf8] transition hover:opacity-90 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Reset credits */}
        <div className="mt-5 space-y-3 border-t border-[var(--line-soft)] pt-5">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Set credits
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={100000}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="w-32 rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]"
            />
            <button
              onClick={handleResetCredits}
              disabled={isPending}
              className="ml-auto rounded-[6px] border border-[var(--line)] px-3 py-2 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </div>

        {/* Destructive */}
        <div className="mt-5 space-y-3 border-t border-[var(--line-soft)] pt-5">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--bad)]">
            Danger zone
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[var(--muted-foreground)]">
              Permanently delete this account and all data.
            </p>
            <AdminDeleteButton userId={user.id} userEmail={user.email} />
          </div>
        </div>
      </div>
    </div>
  );
}
