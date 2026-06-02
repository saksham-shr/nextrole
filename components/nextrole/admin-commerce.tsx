"use client";

import { useState, useTransition } from "react";
import { updateCommerceConfig } from "@/app/actions/admin";
import type { EffectiveCommerce } from "@/lib/commerce/config";

const PLAN_KEYS = [
  { key: "starter_monthly", label: "Starter — monthly" },
  { key: "starter_yearly",  label: "Starter — yearly" },
  { key: "pro_monthly",     label: "Pro — monthly" },
  { key: "pro_yearly",      label: "Pro — yearly" },
];

type Pack = { id: string; credits: number; inr: number };

export function AdminCommerce({
  initial,
  defaults,
}: {
  initial: EffectiveCommerce;
  defaults: EffectiveCommerce;
}) {
  const [planPrices, setPlanPrices] = useState<Record<string, string>>(
    Object.fromEntries(PLAN_KEYS.map(({ key }) => [key, String(initial.planPricesInr[key] ?? "")]))
  );
  const [packs, setPacks] = useState<Pack[]>(initial.topupPacks);
  const [flags, setFlags] = useState(initial.flags);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updatePack(idx: number, field: "id" | "credits" | "inr", value: string) {
    setPacks((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      if (field === "id") return { ...p, id: value.trim() };
      const n = parseInt(value, 10) || 0;
      return { ...p, [field]: n };
    }));
  }

  function addPack() {
    setPacks((p) => [...p, { id: `pack_${Date.now()}`, credits: 100, inr: 99 }]);
  }

  function removePack(idx: number) {
    setPacks((p) => p.filter((_, i) => i !== idx));
  }

  function handleSave() {
    setError(null);
    setSuccess(null);

    const plan_prices_inr: Record<string, number> = {};
    for (const { key } of PLAN_KEYS) {
      const n = parseInt(planPrices[key], 10);
      if (!isNaN(n) && n > 0) plan_prices_inr[key] = n;
    }

    startTransition(async () => {
      const res = await updateCommerceConfig({
        plan_prices_inr,
        topup_packs: packs,
        flags,
      });
      if (res?.error) setError(res.error);
      else setSuccess("Commerce config updated. Takes effect within 30 seconds.");
    });
  }

  function resetToDefaults() {
    setPlanPrices(Object.fromEntries(PLAN_KEYS.map(({ key }) => [key, String(defaults.planPricesInr[key] ?? "")])));
    setPacks(defaults.topupPacks);
    setFlags(defaults.flags);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[6px] border border-[var(--bad)] bg-[#faebeb] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--bad)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[6px] border border-[var(--ok)] bg-[#eef8f0] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ok)]">
          {success}
        </div>
      )}

      {/* Feature flags */}
      <section className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <h3 className="text-[15px] font-semibold">Feature flags</h3>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Disabling a plan prevents new orders. Existing subscriptions are unaffected.
        </p>
        <div className="mt-4 space-y-3">
          {[
            { key: "starter_enabled" as const, label: "Starter subscriptions" },
            { key: "pro_enabled"     as const, label: "Pro subscriptions" },
            { key: "topups_enabled"  as const, label: "Credit top-ups" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
                className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
              />
              <span className="text-[13px] text-[var(--foreground)]">{label}</span>
              <span
                className={`ml-auto font-mono text-[10px] uppercase tracking-[0.14em] ${
                  flags[key] ? "text-[var(--ok)]" : "text-[var(--bad)]"
                }`}
              >
                {flags[key] ? "● Enabled" : "○ Disabled"}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Plan prices */}
      <section className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <h3 className="text-[15px] font-semibold">Subscription prices (INR)</h3>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Server enforces these at order time. Public pricing page caches client-side defaults until next deploy.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLAN_KEYS.map(({ key, label }) => {
            const isDefault = parseInt(planPrices[key], 10) === defaults.planPricesInr[key];
            return (
              <div key={key}>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {label} {!isDefault && <span className="text-[var(--accent)]">(custom)</span>}
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-[var(--muted-foreground)]">₹</span>
                  <input
                    type="number"
                    min={1}
                    max={1_000_000}
                    value={planPrices[key]}
                    onChange={(e) => setPlanPrices((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]"
                  />
                  <span className="font-mono text-[10px] text-[var(--muted-foreground-2)]">
                    default: ₹{defaults.planPricesInr[key]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top-up packs */}
      <section className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold">Top-up packs</h3>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              Server credits the listed amount in exchange for the listed price.
            </p>
          </div>
          <button
            onClick={addPack}
            className="rounded-[6px] border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
          >
            + Add pack
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {packs.length === 0 && (
            <p className="text-[12px] text-[var(--muted-foreground)]">No packs configured. Top-ups will be unavailable.</p>
          )}
          {packs.map((p, idx) => (
            <div key={idx} className="grid grid-cols-[1fr,1fr,1fr,auto] items-end gap-2">
              <Field label="ID">
                <input
                  type="text"
                  value={p.id}
                  onChange={(e) => updatePack(idx, "id", e.target.value)}
                  className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 font-mono text-[12px] outline-none focus:border-[var(--line)]"
                />
              </Field>
              <Field label="Credits">
                <input
                  type="number"
                  min={1}
                  max={100_000}
                  value={p.credits}
                  onChange={(e) => updatePack(idx, "credits", e.target.value)}
                  className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]"
                />
              </Field>
              <Field label="Price (₹)">
                <input
                  type="number"
                  min={1}
                  max={100_000}
                  value={p.inr}
                  onChange={(e) => updatePack(idx, "inr", e.target.value)}
                  className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-[var(--line)]"
                />
              </Field>
              <button
                onClick={() => removePack(idx)}
                className="rounded-[6px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--bad)] hover:bg-[var(--surface-soft)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-5 py-3 shadow-sm">
        <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
          {initial.updatedAt ? `Last updated: ${new Date(initial.updatedAt).toLocaleString()}` : "Using defaults"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="rounded-[6px] border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
          >
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-[6px] bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-[#fffdf8] hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </label>
      {children}
    </div>
  );
}
