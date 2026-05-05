"use client";

import { useState, useTransition } from "react";
import { inviteMember, removeMember, cancelInvite } from "@/app/actions/team";
import type { TeamMemberRow } from "@/app/actions/team";

interface Props {
  members: TeamMemberRow[];
  creditsRemaining: number;
  seatLimit: number;
  error?: string;
}

function StatusBadge({ status }: { status: TeamMemberRow["status"] }) {
  const styles = {
    active:  "bg-[var(--ok-bg)] text-[var(--ok)]",
    pending: "bg-[var(--surface-soft)] text-[var(--muted-foreground)]",
    removed: "bg-red-50 text-red-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${styles[status]}`}>
      {status}
    </span>
  );
}

export function TeamPage({ members: initialMembers, creditsRemaining, seatLimit }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCount  = members.filter(m => m.status === "active").length;
  const pendingCount = members.filter(m => m.status === "pending").length;
  const usedSeats    = activeCount + pendingCount + 1; // +1 for owner
  const seatsLeft    = seatLimit - usedSeats;

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      const result = await inviteMember(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Optimistic: add pending row
      setMembers(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          invited_email: trimmed.toLowerCase(),
          member_id: null,
          status: "pending",
          invited_at: new Date().toISOString(),
          joined_at: null,
        },
      ]);
      setEmail("");
    });
  }

  function handleRemove(memberId: string, rowId: string) {
    startTransition(async () => {
      await removeMember(rowId);
      setMembers(prev => prev.filter(m => m.id !== rowId));
    });
  }

  function handleCancelInvite(rowId: string) {
    startTransition(async () => {
      await cancelInvite(rowId);
      setMembers(prev => prev.filter(m => m.id !== rowId));
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-[var(--foreground)]">Team</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manage your team members. Shared AI credit pool: <strong>{creditsRemaining}</strong> credits.
        </p>
      </div>

      {/* Seat meter */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Seats</span>
          <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
            {usedSeats} / {seatLimit} used
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${Math.min(100, (usedSeats / seatLimit) * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground-2)]">
          {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} available` : "All seats filled"}
        </p>
      </div>

      {/* Invite form */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
          Invite member
        </p>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            disabled={seatsLeft <= 0 || isPending}
            className="flex-1 rounded-xl border border-[var(--line-soft)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground-2)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={seatsLeft <= 0 || isPending || !email.trim()}
            className="rounded-xl bg-[var(--foreground)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--background)] transition hover:opacity-80 disabled:opacity-40"
          >
            {isPending ? "Sending…" : "Invite"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-[12px] text-red-500">{error}</p>
        )}
        {seatsLeft <= 0 && (
          <p className="mt-2 text-[12px] text-[var(--muted-foreground)]">
            All {seatLimit} seats are filled. Remove a member to invite someone new.
          </p>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Members</p>

        {/* Owner row */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] px-4 py-3 mb-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">You (owner)</p>
          </div>
          <span className="rounded-full bg-[var(--accent)] bg-opacity-10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--accent)]">
            owner
          </span>
        </div>

        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted-foreground-2)]">
            No members yet. Invite someone above.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--foreground)]">{member.invited_email}</p>
                  {member.joined_at && (
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground-2)]">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-3">
                  <StatusBadge status={member.status} />
                  {member.status === "active" && member.member_id && (
                    <button
                      onClick={() => handleRemove(member.member_id!, member.id)}
                      disabled={isPending}
                      className="font-mono text-[10px] text-red-400 transition hover:text-red-600 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  )}
                  {member.status === "pending" && (
                    <button
                      onClick={() => handleCancelInvite(member.id)}
                      disabled={isPending}
                      className="font-mono text-[10px] text-[var(--muted-foreground)] transition hover:text-red-500 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit info */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-5 py-4">
        <p className="text-[12px] text-[var(--muted-foreground)]">
          All team members share your AI credit pool. Credits deducted by any member reduce your balance.
          <a href="/dashboard/billing" className="ml-1 text-[var(--accent)] hover:underline">
            Top up credits →
          </a>
        </p>
      </div>
    </div>
  );
}
