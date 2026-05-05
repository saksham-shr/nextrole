"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, declineInvite } from "@/app/actions/team";
import { BrandWordmark } from "@/components/nextrole/brand";

export function AcceptInvitePage({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"accept" | "decline" | null>(null);

  function handle(type: "accept" | "decline") {
    setAction(type);
    setError(null);
    startTransition(async () => {
      const result = type === "accept"
        ? await acceptInvite(inviteId)
        : await declineInvite(inviteId);

      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(type === "accept" ? "/dashboard" : "/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandWordmark />
        </div>

        <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] bg-opacity-10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>

          <h1 className="font-serif text-xl font-bold text-[var(--foreground)]">Team invitation</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            You've been invited to join a team on NextRole. Accept to get access to the full Team plan features and shared credits.
          </p>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] text-red-600">{error}</p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => handle("decline")}
              disabled={isPending}
              className="flex-1 rounded-xl border border-[var(--line-soft)] py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--muted-foreground)] transition hover:border-[var(--line)] disabled:opacity-40"
            >
              {isPending && action === "decline" ? "Declining…" : "Decline"}
            </button>
            <button
              onClick={() => handle("accept")}
              disabled={isPending}
              className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {isPending && action === "accept" ? "Joining…" : "Accept & join"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
