"use client";

import { useState, useMemo } from "react";
import {
  Button,
  Display,
  Eyebrow,
  InputField,
  SectionTitle,
  Surface,
  Badge,
} from "@/components/nextrole/ui";
import { updateProfile } from "@/app/actions/profile";
import type { ProfileRow } from "@/lib/db/types";
import { BASE_ARCHETYPES } from "@/lib/evaluate/prompt";

// ─── Locale detection ─────────────────────────────────────────────────────────

function useIsIndia(): boolean {
  return useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
    } catch { return false; }
  }, []);
}

// ─── Compensation slider ──────────────────────────────────────────────────────

function CompensationSlider({
  isIndia,
  currentComp,
  compMin,
  compMax,
}: {
  isIndia: boolean;
  currentComp?: number | null;
  compMin?: number | null;
  compMax?: number | null;
}) {
  const sliderMin = isIndia ? 1 : 30000;
  const sliderMax = isIndia ? 300 : 600000;
  const step = isIndia ? 1 : 10000;

  function fmt(v: number) {
    if (isIndia) return `${v} LPA`;
    return `$${(v / 1000).toFixed(0)}k`;
  }

  const defaultCurrent = currentComp ?? (isIndia ? 15 : 100000);
  const defaultMin = compMin ?? (isIndia ? 10 : 80000);
  const defaultMax = compMax ?? (isIndia ? 30 : 200000);

  const [currentVal, setCurrentVal] = useState(defaultCurrent);
  const [minVal, setMinVal] = useState(defaultMin);
  const [maxVal, setMaxVal] = useState(defaultMax);

  const minPct = ((minVal - sliderMin) / (sliderMax - sliderMin)) * 100;
  const maxPct = ((maxVal - sliderMin) / (sliderMax - sliderMin)) * 100;

  const unitLabel = isIndia ? "LPA" : "USD / yr";
  const localeBadge = isIndia
    ? "🇮🇳 ₹ INR · LPA"
    : "🌍 $ USD · per year";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)] rounded border border-[var(--line-soft)] px-2 py-0.5">
          {localeBadge}
        </span>
      </div>

      {/* Current compensation */}
      <div>
        <label className="block">
          <Eyebrow className="mb-2 block">Current total comp ({unitLabel})</Eyebrow>
          <input type="hidden" name="current_comp" value={currentVal} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[var(--muted-foreground)]">Current</span>
            <span className="font-mono text-[14px] font-medium text-[var(--foreground)]">{fmt(currentVal)}</span>
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={step}
            value={currentVal}
            onChange={(e) => setCurrentVal(Number(e.target.value))}
            className="w-full h-[5px]"
            style={{ accentColor: "var(--accent)" }}
          />
          <div className="flex justify-between mt-1 text-[10px] text-[var(--muted-foreground)] font-mono">
            <span>{fmt(sliderMin)}</span>
            <span>{fmt(sliderMax)}</span>
          </div>
        </label>
      </div>

      {/* Target range */}
      <div>
        <Eyebrow className="mb-3 block">Target range ({unitLabel})</Eyebrow>
        <input type="hidden" name="comp_min" value={minVal} />
        <input type="hidden" name="comp_max" value={maxVal} />
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase mb-0.5">Min</div>
            <div className="font-mono text-[14px] font-medium text-[var(--accent)]">{fmt(minVal)}</div>
          </div>
          <div className="flex-1 mx-4 relative">
            {/* Track */}
            <div className="relative h-[6px] rounded-full" style={{ background: "var(--line-soft)" }}>
              <div
                className="absolute h-full rounded-full"
                style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, background: "var(--accent)" }}
              />
            </div>
            {/* Min thumb */}
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={step}
              value={minVal}
              onChange={(e) => { const v = Number(e.target.value); if (v < maxVal) setMinVal(v); }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: 6 }}
            />
            {/* Max thumb */}
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={step}
              value={maxVal}
              onChange={(e) => { const v = Number(e.target.value); if (v > minVal) setMaxVal(v); }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: 6 }}
            />
            {/* Visual thumb dots */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow pointer-events-none"
              style={{ left: `calc(${minPct}% - 8px)` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow pointer-events-none"
              style={{ left: `calc(${maxPct}% - 8px)` }}
            />
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase mb-0.5">Max</div>
            <div className="font-mono text-[14px] font-medium text-[var(--accent)]">{fmt(maxVal)}</div>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] font-mono">
          <span>{fmt(sliderMin)}</span>
          <span>{fmt(sliderMax)}</span>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          Drag both ends to set your min and max target
        </p>
      </div>
    </div>
  );
}

function Alert({ message, tone }: { message: string; tone: "ok" | "bad" }) {
  const styles = {
    ok: "border-[var(--ok)] bg-[#eef8f0] text-[var(--ok)]",
    bad: "border-[var(--bad)] bg-[#faebeb] text-[var(--bad)]",
  };
  return (
    <p className={`rounded-[14px] border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] ${styles[tone]}`}>
      {message}
    </p>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string | null;
  hint?: string;
}) {
  return (
    <label className="block">
      <Eyebrow className="mb-2 block">{label}</Eyebrow>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
      >
        <option value="">— not set —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{hint}</p>
      )}
    </label>
  );
}

/** Quick-read stat pill */
function ProfileStat({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="rounded-[16px] border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3">
      <Eyebrow className="mb-1">{label}</Eyebrow>
      <p className="text-sm font-bold leading-snug">{value}</p>
    </div>
  );
}

export function ProfilePageContent({
  profile,
  error,
  message,
}: {
  profile: ProfileRow | null;
  error?: string;
  message?: string;
}) {
  const isIndia = useIsIndia();
  const hasCV = Boolean(profile?.base_cv);
  const completionFields = [
    profile?.full_name,
    profile?.target_roles?.length,
    profile?.base_cv,
    profile?.comp_min || profile?.comp_max,
    profile?.seniority,
    profile?.work_mode,
  ];
  const completionPct = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  );

  const archetypeOptions = BASE_ARCHETYPES.map((a) => ({ value: a, label: a }));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Profile</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Your targeting profile powers every AI workflow — evaluation scoring, resume tailoring, interview prep, and pattern analysis all read from here.
        </p>
      </div>

      {error && <Alert message={error} tone="bad" />}
      {message && <Alert message={message} tone="ok" />}

      {/* Completion status */}
      <Surface tone={completionPct >= 80 ? "ok" : completionPct >= 50 ? "warn" : "default"} className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <SectionTitle
              title={`Profile ${completionPct}% complete`}
              subtitle={completionPct < 100 ? "Fill in the missing fields to improve every AI output" : "Profile fully configured"}
            />
            {!hasCV && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                ⚠️ No CV yet — <a href="/dashboard/settings" className="underline">add it in Settings</a> to unlock evaluation and resume generation.
              </p>
            )}
          </div>
          <span className="font-[var(--font-caveat)] text-5xl font-bold leading-none text-[var(--accent)]">
            {completionPct}%
          </span>
        </div>

        {/* Quick-read summary */}
        {profile && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileStat label="Name" value={profile.full_name} />
            <ProfileStat label="Seniority" value={profile.seniority} />
            <ProfileStat label="Work mode" value={profile.work_mode} />
            <ProfileStat label="Target roles" value={profile.target_roles?.join(", ") || null} />
            <ProfileStat
              label="Comp target"
              value={
                profile.comp_min && profile.comp_max
                  ? isIndia
                    ? `₹${profile.comp_min}–${profile.comp_max} LPA`
                    : `$${(profile.comp_min / 1000).toFixed(0)}k – $${(profile.comp_max / 1000).toFixed(0)}k`
                  : profile.comp_min
                    ? isIndia
                      ? `min ₹${profile.comp_min} LPA`
                      : `min $${(profile.comp_min / 1000).toFixed(0)}k`
                    : null
              }
            />
            <ProfileStat label="Locations" value={profile.target_locations?.join(", ") || null} />
          </div>
        )}
      </Surface>

      {/* Edit form */}
      <form action={updateProfile} className="space-y-5">
        {/* Identity */}
        <Surface className="p-5">
          <SectionTitle title="Identity" subtitle="Who you are and how you show up" />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Full name"
              name="full_name"
              placeholder="Alex Johnson"
              defaultValue={profile?.full_name ?? ""}
            />
            <InputField
              label="Years of experience"
              name="years_experience"
              type="number"
              placeholder="8"
              defaultValue={profile?.years_experience ?? ""}
            />
            <SelectField
              label="Seniority"
              name="seniority"
              defaultValue={profile?.seniority}
              options={[
                { value: "junior", label: "Junior (0–2 yrs)" },
                { value: "mid", label: "Mid-level (2–5 yrs)" },
                { value: "senior", label: "Senior (5–8 yrs)" },
                { value: "staff", label: "Staff / Principal (8+ yrs)" },
                { value: "principal", label: "Distinguished / Fellow" },
              ]}
            />
            <SelectField
              label="Work mode preference"
              name="work_mode"
              defaultValue={profile?.work_mode}
              options={[
                { value: "remote", label: "Remote only" },
                { value: "hybrid", label: "Hybrid (2–3 days office)" },
                { value: "onsite", label: "On-site" },
              ]}
            />
          </div>
        </Surface>

        {/* Job targeting */}
        <Surface className="p-5">
          <SectionTitle
            title="Job targeting"
            subtitle="These fields steer evaluation, archetype detection, and resume focus"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Target roles (comma-separated)"
              name="target_roles"
              placeholder="Staff Engineer, Principal Engineer, EM"
              defaultValue={profile?.target_roles?.join(", ") ?? ""}
            />
            <InputField
              label="Target locations (comma-separated)"
              name="target_locations"
              placeholder="London, Remote, Berlin"
              defaultValue={profile?.target_locations?.join(", ") ?? ""}
            />
            <InputField
              label="Target archetypes (comma-separated)"
              name="target_archetypes"
              placeholder="LLMOps, Platform, Product Eng"
              defaultValue={profile?.target_archetypes?.join(", ") ?? ""}
              hint={`Defaults: ${BASE_ARCHETYPES.slice(0, 5).join(", ")}…`}
            />
            <InputField
              label="Preferred company types (comma-separated)"
              name="preferred_company_types"
              placeholder="startup, scaleup, AI lab"
              defaultValue={profile?.preferred_company_types?.join(", ") ?? ""}
            />
            <InputField
              label="Technical languages (comma-separated)"
              name="languages"
              placeholder="TypeScript, Python, Go"
              defaultValue={profile?.languages?.join(", ") ?? ""}
            />
          </div>
        </Surface>

        {/* Compensation */}
        <Surface className="p-5">
          <SectionTitle
            title="Compensation"
            subtitle="Drives comp analysis in every evaluation — same currency throughout"
          />
          <CompensationSlider
            isIndia={isIndia}
            currentComp={profile?.current_comp}
            compMin={profile?.comp_min}
            compMax={profile?.comp_max}
          />
        </Surface>

        {/* AI customisation — mirrored from settings but scoped to eval behaviour */}
        <Surface className="p-5">
          <SectionTitle
            title="Evaluation behaviour"
            subtitle="Fine-tune how the AI scores and interprets roles for you"
          />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Apply threshold (1.0–5.0, default 3.5)"
                name="eval_score_apply"
                type="number"
                placeholder="3.5"
                defaultValue={profile?.eval_score_apply ?? 3.5}
              />
              <InputField
                label="Watch threshold (1.0–5.0, default 2.5)"
                name="eval_score_watch"
                type="number"
                placeholder="2.5"
                defaultValue={profile?.eval_score_watch ?? 2.5}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Score ≥ Apply → "apply" · Between thresholds → "watch" · Below Watch → "skip"
            </p>
            <InputField
              label="Custom evaluation focus"
              name="custom_eval_focus"
              textarea
              rows={4}
              placeholder="e.g. Prioritise companies with strong remote culture. Weight AI/ML stack experience highly. Flag roles requiring >20% travel."
              defaultValue={profile?.custom_eval_focus ?? ""}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Plain English — injected into every evaluation prompt
            </p>
            <InputField
              label="Custom archetype list (comma-separated, overrides defaults)"
              name="custom_archetypes"
              placeholder="AI Infrastructure, Applied ML, Developer Relations"
              defaultValue={profile?.custom_archetypes?.join(", ") ?? ""}
            />
          </div>
        </Surface>

        <div className="flex gap-3">
          <Button type="submit" tone="accent">Save profile</Button>
          <Button href="/dashboard/settings" ghost>Full settings →</Button>
        </div>
      </form>

      {/* System impact panel */}
      <Surface tone="accent" className="p-5">
        <SectionTitle title="How this profile is used" subtitle="Every AI workflow reads from these fields" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { workflow: "Evaluate", uses: "CV + seniority + comp + target roles + custom focus + thresholds" },
            { workflow: "Resume", uses: "CV + target roles + archetypes + languages + comp context" },
            { workflow: "Interview Prep", uses: "CV + seniority + target roles + custom focus" },
            { workflow: "Apply", uses: "CV + full name + comp range" },
            { workflow: "Contact Outreach", uses: "CV + full name + target company types" },
            { workflow: "Pattern Analytics", uses: "Target archetypes + comp + work mode + locations" },
            { workflow: "Training Evaluator", uses: "CV + target roles + target archetypes" },
            { workflow: "Project Evaluator", uses: "CV + target roles + archetypes" },
            { workflow: "Deep Research", uses: "Target company types + archetypes" },
          ].map(({ workflow, uses }) => (
            <div key={workflow} className="rounded-[16px] border border-[rgba(200,74,31,0.2)] bg-[rgba(200,74,31,0.05)] p-3">
              <p className="font-bold text-sm">{workflow}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)] leading-relaxed">{uses}</p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
