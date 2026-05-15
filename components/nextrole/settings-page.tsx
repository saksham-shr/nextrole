"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserTier } from "@/lib/db/types";

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <div className="mb-5 border-b border-[var(--line-soft)] pb-4">
        <div className="text-[15px] font-semibold">{title}</div>
        {subtitle && <div className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "ok" | "warn" | "accent" }) {
  const styles: Record<string, string> = {
    default: "bg-[var(--surface-soft)] text-[var(--foreground)]",
    ok:      "bg-[var(--ok-bg)] text-[var(--ok)]",
    warn:    "bg-[var(--warn-bg)] text-[var(--warn)]",
    accent:  "bg-[var(--accent-bg)] text-[var(--accent)]",
  };
  return (
    <span className={`inline-flex items-center rounded-[5px] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] ${styles[tone]}`}>
      {children}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function SaveToast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDone, 2500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-[var(--ok)] bg-[var(--surface)] px-4 py-3 shadow-lg"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span className="text-[13px] font-medium text-[var(--foreground)]">{message}</span>
    </div>
  );
}

// ─── Billing section ──────────────────────────────────────────────────────────

function PlanBadge({ tier }: { tier: UserTier }) {
  if (tier === "pro")     return <Badge tone="ok">Pro</Badge>;
  if (tier === "starter") return <Badge tone="accent">Starter</Badge>;
  return <Badge tone="default">Free</Badge>;
}

function BillingSection({
  tier,
  email,
  creditsRemaining,
  renewsAt,
  subscriptionStatus,
  portalUrl,
}: {
  tier: UserTier;
  email: string;
  creditsRemaining: number;
  renewsAt: string | null;
  subscriptionStatus: string | null;
  portalUrl: string | null;
}) {
  const isPaid = tier === "starter" || tier === "pro";

  function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  const statusLabel =
    subscriptionStatus === "active"   ? "Active" :
    subscriptionStatus === "cancelled" ? "Cancelled" :
    subscriptionStatus === "past_due"  ? "Past due" :
    subscriptionStatus ?? "—";

  return (
    <Card id="billing" title="Plan & Billing" subtitle="Your current plan and subscription details.">
      <div className="flex flex-col gap-5">
        {/* Plan row */}
        <div className="flex items-center justify-between rounded-lg border border-[var(--line-soft)] bg-[var(--background)] px-4 py-3">
          <div className="flex items-center gap-3">
            <PlanBadge tier={tier} />
            <span className="text-[13px] font-medium capitalize">{tier} plan</span>
          </div>
          {isPaid && <span className="text-[12px] text-[var(--muted-foreground)]">{statusLabel}</span>}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {isPaid && (
            <div className="rounded-lg bg-[var(--surface-soft)] px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Renews / Ends</div>
              <div className="mt-1 text-[13px] font-medium">{fmtDate(renewsAt)}</div>
            </div>
          )}
          {isPaid && (
            <div className="rounded-lg bg-[var(--surface-soft)] px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Credits today</div>
              <div className="mt-1 text-[13px] font-medium">{creditsRemaining}</div>
            </div>
          )}
          <div className="rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 col-span-2 sm:col-span-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Account</div>
            <div className="mt-1 truncate text-[12px] text-[var(--muted-foreground)]">{email}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isPaid && portalUrl && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[var(--line-soft)] px-4 py-2 text-[13px] font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Manage subscription →
            </a>
          )}
          {!isPaid && (
            <a
              href="/dashboard/billing"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
            >
              Upgrade plan →
            </a>
          )}
          <a
            href="/dashboard/billing"
            className="rounded-lg border border-[var(--line-soft)] px-4 py-2 text-[13px] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            Full billing details
          </a>
        </div>
      </div>
    </Card>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function sendReset() {
    setStatus("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setErrorMsg(error.message); setStatus("error"); }
      else setStatus("sent");
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  return (
    <Card id="password" title="Password" subtitle="Send a password-reset link to your inbox.">
      {status === "sent" ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--ok)] bg-[var(--ok-bg)] px-4 py-3 text-[13px] text-[var(--ok)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Check your inbox — reset link sent to {email}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            We&apos;ll send a secure link to <strong>{email}</strong>. Follow it to set a new password.
          </p>
          {status === "error" && (
            <div className="rounded-lg border border-[var(--bad)] bg-[var(--bad-bg)] px-4 py-3 text-[12.5px] text-[var(--bad)]">
              {errorMsg}
            </div>
          )}
          <div>
            <button
              onClick={sendReset}
              disabled={status === "sending"}
              className="rounded-lg border border-[var(--line-soft)] px-4 py-2 text-[13px] font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send reset email"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Activity log section ─────────────────────────────────────────────────────

const TASK_LABELS: Record<string, string> = {
  evaluate:        "Evaluation",
  resume_standard: "Resume",
  resume_premium:  "Resume (Premium)",
  tailor:          "Tailor",
  autofill:        "Autofill",
  topup:           "Top-up",
};

function ActivitySection({ log }: { log: Array<{ id: string; task_type: string; credits_used: number; created_at: string }> }) {
  function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <Card id="activity" title="Activity log" subtitle="Your last 30 AI credit transactions.">
      {log.length === 0 ? (
        <p className="text-[13px] text-[var(--muted-foreground)]">No activity yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--line-soft)]">
          <table className="min-w-full border-collapse">
            <thead className="bg-[var(--surface-soft)]">
              <tr>
                {["Action", "Credits", "Date"].map((h) => (
                  <th key={h} className="border-b border-[var(--line-soft)] px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={entry.id} className="border-b border-dashed border-[var(--line-softer)] last:border-0">
                  <td className="px-4 py-2.5 text-[13px]">
                    {TASK_LABELS[entry.task_type] ?? entry.task_type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="font-mono text-[12px]"
                      style={{ color: entry.credits_used <= 0 ? "var(--ok)" : "var(--muted-foreground)" }}
                    >
                      {entry.credits_used <= 0 ? `+${Math.abs(entry.credits_used)}` : `-${entry.credits_used}`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {fmtDateTime(entry.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV = [
  { id: "billing",  label: "Billing" },
  { id: "password", label: "Password" },
  { id: "activity", label: "Activity log" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPageContent({
  tier,
  email,
  creditsRemaining,
  renewsAt,
  subscriptionStatus,
  portalUrl,
  creditLog,
}: {
  tier: UserTier;
  email: string;
  creditsRemaining: number;
  renewsAt: string | null;
  subscriptionStatus: string | null;
  portalUrl: string | null;
  creditLog: Array<{ id: string; task_type: string; credits_used: number; created_at: string }>;
}) {
  const [activeSection, setActiveSection] = useState("billing");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto pt-4" style={{ maxWidth: 900 }}>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[180px_1fr]">

        {/* Sidebar */}
        <div className="shrink-0">
          <div className="mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Settings</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="rounded-[5px] px-3 py-2 text-left text-[13px] transition"
                style={{
                  background:  activeSection === item.id ? "var(--surface)" : "transparent",
                  border:      `1px solid ${activeSection === item.id ? "var(--line-soft)" : "transparent"}`,
                  color:       activeSection === item.id ? "var(--foreground)" : "var(--muted-foreground)",
                  fontWeight:  activeSection === item.id ? 500 : 400,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex flex-col gap-6">
          <h1 className="text-[24px] font-normal tracking-[-0.02em]">Settings</h1>

          <BillingSection
            tier={tier}
            email={email}
            creditsRemaining={creditsRemaining}
            renewsAt={renewsAt}
            subscriptionStatus={subscriptionStatus}
            portalUrl={portalUrl}
          />

          <PasswordSection email={email} />

          <ActivitySection log={creditLog} />
        </div>
      </div>

      <SaveToast message={toastMsg} onDone={() => setToastMsg(null)} />
    </div>
  );
}
