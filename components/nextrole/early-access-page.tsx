"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/nextrole/brand";
import { signOut } from "@/app/actions/auth";

export function EarlyAccessPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) { setErrorMsg("Enter a valid email."); setStatus("error"); return; }
    setStatus("loading");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, tier: "pro" }),
    });

    if (res.ok) {
      setStatus("done");
    } else {
      const json = await res.json().catch(() => ({}));
      setErrorMsg(json.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 text-[var(--foreground)]" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-[460px]">

        {/* Brand */}
        <div className="mb-10 flex flex-col items-center gap-2">
          <BrandMark size={40} />
          <span
            className="font-medium text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 17 }}
          >
            nextrole
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface)] p-8"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          {/* Lock icon */}
          <div className="mb-5 flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(200,74,31,0.08)", border: "1px solid rgba(200,74,31,0.15)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>

          <h1 className="mb-2 text-center text-[22px] font-semibold tracking-[-0.01em]">
            Invite-only access
          </h1>
          <p className="mb-6 text-center text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
            NextRole is currently in private beta. Your account was created, but you need an invite to access the dashboard.
          </p>

          {status === "done" ? (
            <div className="rounded-[8px] border border-[var(--ok)] bg-[#eef8f0] px-5 py-4 text-center">
              <p className="text-[14px] font-medium text-[var(--ok)]">You&apos;re on the list!</p>
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                We&apos;ll email you when your invite is ready.
              </p>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-3">
              <label className="block">
                <div
                  className="mb-1.5 uppercase text-[var(--muted-foreground)]"
                  style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, letterSpacing: "0.12em" }}
                >
                  Your email
                </div>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                  required
                  className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
                />
              </label>

              {status === "error" && (
                <p className="rounded-[6px] border border-[var(--bad)] bg-[#faebeb] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--bad)]">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-[6px] py-2.5 text-[14px] font-medium text-[#fffdf8] transition hover:opacity-90 disabled:opacity-60"
                style={{ background: "var(--accent)" }}
              >
                {status === "loading" ? "Joining…" : "Request early access"}
              </button>
            </form>
          )}

          <div className="mt-5 flex items-center gap-2.5">
            <div className="h-px flex-1 bg-[var(--line-soft)]" />
            <span className="text-[11px] text-[var(--muted-foreground-2)]" style={{ fontFamily: "var(--font-mono-stack)" }}>or</span>
            <div className="h-px flex-1 bg-[var(--line-soft)]" />
          </div>

          <div className="mt-4 space-y-2 text-center text-[13px] text-[var(--muted-foreground)]">
            <p>
              Already have an invite?{" "}
              <Link href="/dashboard" className="font-medium text-[var(--accent)] hover:underline">
                Go to dashboard
              </Link>
            </p>
            <form action={signOut}>
              <button
                type="submit"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] text-[var(--muted-foreground)]">
          © 2026 NextRole ·{" "}
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
    </main>
  );
}
