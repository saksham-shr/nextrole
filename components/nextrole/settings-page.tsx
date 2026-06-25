"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserTier } from "@/lib/db/types";
import { useToast } from "@/components/nextrole/toast";

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
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [status, setStatus]     = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setErrorMsg("New passwords do not match."); setStatus("error"); return; }
    if (next.length < 8)  { setErrorMsg("Password must be at least 8 characters."); setStatus("error"); return; }

    setStatus("saving");
    setErrorMsg("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInError) { setErrorMsg("Current password is incorrect."); setStatus("error"); return; }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) { setErrorMsg(updateError.message); setStatus("error"); return; }

      setStatus("saved");
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  const inputCls = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] transition placeholder:text-[var(--muted-foreground)]";

  return (
    <Card id="password" title="Change Password" subtitle="Enter your current password to set a new one.">
      {status === "saved" ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--ok)] bg-[var(--ok-bg)] px-4 py-3 text-[13px] text-[var(--ok)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Password updated successfully.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" autoComplete="off">
          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-medium text-[var(--muted-foreground)]">Current password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" required className={inputCls} autoComplete="current-password" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-medium text-[var(--muted-foreground)]">New password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="••••••••" required minLength={8} className={inputCls} autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11.5px] font-medium text-[var(--muted-foreground)]">Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required className={inputCls} autoComplete="new-password" />
          </div>

          {status === "error" && (
            <div className="rounded-lg border border-[var(--bad)] bg-[var(--bad-bg)] px-4 py-3 text-[12.5px] text-[var(--bad)]">
              {errorMsg}
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {status === "saving" ? "Saving…" : "Update password"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

// ─── Activity log section ─────────────────────────────────────────────────────

const TASK_LABELS: Record<string, string> = {
  evaluate:       "Evaluation",
  tailor_resume:  "Resume",
  autofill:       "Autofill",
  topup:          "Top-up",
  daily_reset:    "Daily reset",
  credits_expired: "Credits expired",
};

function ActivitySection({ log }: { log: Array<{ id: string; activity_type: string; credits_used: number; created_at: string }> }) {
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
                    {TASK_LABELS[entry.activity_type] ?? entry.activity_type}
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

// ─── Browser extension tokens ────────────────────────────────────────────────
// Lists the user's active extension tokens (issued via /api/extension/token)
// and lets them revoke any token. Last-used time is shown for context.

type ExtensionToken = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
};

function ExtensionTokensSection({ onToast }: { onToast: (msg: string) => void }) {
  const toast = useToast();
  const [tokens, setTokens] = useState<ExtensionToken[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/extension/token", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load extension tokens");
      const data = await res.json();
      setTokens(data.tokens ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id: string, name: string) => {
    if (!(await toast.confirm(`Revoke "${name}"? This will sign out any browser using this token.`))) return;
    setRevoking(id);
    try {
      const res = await fetch("/api/extension/token", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to revoke token");
      onToast(`Revoked "${name}"`);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Card
      id="extension"
      title="Browser extension"
      subtitle="Active extension installations connected to your NextRole account."
    >
      {loading && (
        <p className="text-[13px] text-[var(--muted-foreground)]">Loading…</p>
      )}

      {error && !loading && (
        <p className="text-[13px]" style={{ color: "var(--warn)" }}>{error}</p>
      )}

      {!loading && !error && tokens && tokens.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--line-soft)] p-5 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            No extensions connected.
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
            Install the NextRole extension from the Chrome Web Store and click "Connect account".
          </p>
        </div>
      )}

      {!loading && !error && tokens && tokens.length > 0 && (
        <div className="flex flex-col gap-2">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--foreground)]">{token.name}</span>
                  {token.last_used_at && isRecentlyActive(token.last_used_at) && (
                    <Badge tone="ok">active</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex gap-3 font-mono text-[11px] text-[var(--muted-foreground)]">
                  <span>created {formatRelativeDate(token.created_at)}</span>
                  <span>·</span>
                  <span>
                    {token.last_used_at
                      ? `last used ${formatRelativeDate(token.last_used_at)}`
                      : "never used"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => revoke(token.id, token.name)}
                disabled={revoking === token.id}
                className="rounded-[5px] border border-[var(--line-soft)] bg-transparent px-3 py-1.5 text-[12px] text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:opacity-50"
                style={{ color: "var(--warn)" }}
              >
                {revoking === token.id ? "Revoking…" : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-[var(--line-soft)] pt-4 text-[12px] text-[var(--muted-foreground)]">
        Revoking a token signs the extension out of your account on that browser.
        The user will need to click "Connect account" again to reconnect.
      </div>
    </Card>
  );
}

function isRecentlyActive(iso: string): boolean {
  const dt = new Date(iso).getTime();
  return Date.now() - dt < 7 * 24 * 60 * 60 * 1000; // within 7 days
}

function formatRelativeDate(iso: string): string {
  const dt = new Date(iso);
  const seconds = Math.max(0, (Date.now() - dt.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d ago`;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV = [
  { id: "billing",   label: "Billing" },
  { id: "extension", label: "Browser extension" },
  { id: "ai_eval",   label: "AI & Evaluation" },
  { id: "password",  label: "Password" },
  { id: "activity",  label: "Activity log" },
];

// ─── AI & Evaluation ──────────────────────────────────────────────────────────

type AiPrefs = {
  preferred_language: string;
  eval_score_apply: number;
  eval_score_watch: number;
  custom_eval_focus: string;
  custom_archetypes: string[];
  target_archetypes: string[];
  preferred_company_types: string[];
};

const LANGS = ["English", "Hindi", "Hinglish", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali", "Gujarati"];

function AIEvalSection({ initial }: { initial: AiPrefs }) {
  const [prefs, setPrefs] = useState<AiPrefs>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_language: prefs.preferred_language,
          eval_score_apply: prefs.eval_score_apply,
          eval_score_watch: prefs.eval_score_watch,
          custom_eval_focus: prefs.custom_eval_focus,
          custom_archetypes: prefs.custom_archetypes,
          target_archetypes: prefs.target_archetypes,
          preferred_company_types: prefs.preferred_company_types,
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        setMsg(j.error ?? "Save failed");
      } else {
        setMsg("Saved");
        setTimeout(() => setMsg(null), 2000);
      }
    } catch { setMsg("Save failed"); }
    finally { setBusy(false); }
  }

  const inputCls = "w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]";
  const selectCls = "w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]";

  return (
    <Card id="ai_eval" title="AI & Evaluation" subtitle="Customise how every AI workflow runs for you.">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Output language</div>
            <select className={selectCls} value={prefs.preferred_language} onChange={(e) => setPrefs((p) => ({ ...p, preferred_language: e.target.value }))}>
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Apply threshold <span className="normal-case text-[var(--muted-foreground-2)]">(apply if score ≥)</span>
            </div>
            <input type="number" min={0} max={5} step={0.5} className={inputCls}
              value={prefs.eval_score_apply}
              onChange={(e) => setPrefs((p) => ({ ...p, eval_score_apply: parseFloat(e.target.value) }))} />
          </div>
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Watch threshold <span className="normal-case text-[var(--muted-foreground-2)]">(watch if score ≥)</span>
            </div>
            <input type="number" min={0} max={5} step={0.5} className={inputCls}
              value={prefs.eval_score_watch}
              onChange={(e) => setPrefs((p) => ({ ...p, eval_score_watch: parseFloat(e.target.value) }))} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Custom eval focus</div>
          <textarea rows={3} className={inputCls} placeholder="e.g. Prioritise roles with ML infra work over pure SWE…"
            value={prefs.custom_eval_focus}
            onChange={(e) => setPrefs((p) => ({ ...p, custom_eval_focus: e.target.value }))} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[#fffdf8] transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {msg && (
            <span className={`font-mono text-[11px] ${msg === "Saved" ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>{msg}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPageContent({
  tier,
  email,
  creditsRemaining,
  renewsAt,
  subscriptionStatus,
  portalUrl,
  creditLog,
  aiPrefs,
}: {
  tier: UserTier;
  email: string;
  creditsRemaining: number;
  renewsAt: string | null;
  subscriptionStatus: string | null;
  portalUrl: string | null;
  creditLog: Array<{ id: string; activity_type: string; credits_used: number; created_at: string }>;
  aiPrefs?: AiPrefs;
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

          <ExtensionTokensSection onToast={setToastMsg} />

          {aiPrefs && <AIEvalSection initial={aiPrefs} />}

          <PasswordSection email={email} />

          <ActivitySection log={creditLog} />
        </div>
      </div>

      <SaveToast message={toastMsg} onDone={() => setToastMsg(null)} />
    </div>
  );
}
