"use client";

import { useState } from "react";
import {
  Button,
  Display,
  Eyebrow,
  InputField,
  SectionTitle,
  Surface,
} from "@/components/nextrole/ui";
import { updateProfile } from "@/app/actions/profile";
import type { ProfileRow } from "@/lib/db/types";


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
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string | null;
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
    </label>
  );
}

export function SettingsPageContent({
  profile,
  error,
  message,
}: {
  profile: ProfileRow | null;
  error?: string;
  message?: string;
}) {
  const cvMissing = !profile?.base_cv;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Settings</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Your profile powers every evaluation — fill in your CV before running your first analysis.
        </p>
      </div>

      {error && <Alert message={error} tone="bad" />}
      {message && <Alert message={message} tone="ok" />}

      {cvMissing && (
        <Surface tone="warn" className="p-5">
          <SectionTitle
            title="CV required"
            subtitle="Paste your base CV below — the evaluator reads it for every job analysis"
          />
        </Surface>
      )}

      <form action={updateProfile} className="space-y-5">
        {/* Basic profile */}
        <Surface className="p-5">
          <SectionTitle title="Profile" subtitle="Basic info about you" />
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
              label="Seniority level"
              name="seniority"
              defaultValue={profile?.seniority}
              options={[
                { value: "junior", label: "Junior" },
                { value: "mid", label: "Mid-level" },
                { value: "senior", label: "Senior" },
                { value: "staff", label: "Staff" },
                { value: "principal", label: "Principal / Distinguished" },
              ]}
            />
            <SelectField
              label="Work mode preference"
              name="work_mode"
              defaultValue={profile?.work_mode}
              options={[
                { value: "remote", label: "Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "onsite", label: "On-site" },
              ]}
            />
          </div>
        </Surface>

        {/* Job preferences */}
        <Surface className="p-5">
          <SectionTitle
            title="Job preferences"
            subtitle="Used to contextualise fit and compensation scoring"
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
              placeholder="product_eng, platform_eng, fullstack"
              defaultValue={profile?.target_archetypes?.join(", ") ?? ""}
            />
            <InputField
              label="Preferred company types (comma-separated)"
              name="preferred_company_types"
              placeholder="startup, scaleup, enterprise"
              defaultValue={profile?.preferred_company_types?.join(", ") ?? ""}
            />
            <InputField
              label="Languages (comma-separated)"
              name="languages"
              placeholder="TypeScript, Python, Go, English"
              defaultValue={profile?.languages?.join(", ") ?? ""}
            />
          </div>
        </Surface>

        {/* Compensation */}
        <Surface className="p-5">
          <SectionTitle
            title="Compensation"
            subtitle="Used in compensation analysis — all figures in same currency (£ / $ / €)"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <InputField
              label="Current comp (£/$/yr)"
              name="current_comp"
              type="number"
              placeholder="95000"
              defaultValue={profile?.current_comp ?? ""}
            />
            <InputField
              label="Minimum target comp"
              name="comp_min"
              type="number"
              placeholder="120000"
              defaultValue={profile?.comp_min ?? ""}
            />
            <InputField
              label="Maximum target comp"
              name="comp_max"
              type="number"
              placeholder="180000"
              defaultValue={profile?.comp_max ?? ""}
            />
          </div>
        </Surface>

        {/* AI & Evaluation customisation */}
        <Surface className="p-5">
          <SectionTitle
            title="AI & Evaluation"
            subtitle="Customise how every AI workflow runs for you"
          />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Preferred language for AI output"
                name="preferred_language"
                defaultValue={profile?.preferred_language ?? "en"}
                options={[
                  { value: "en", label: "English" },
                  { value: "es", label: "Spanish / Español" },
                  { value: "fr", label: "French / Français" },
                  { value: "de", label: "German / Deutsch" },
                  { value: "pt", label: "Portuguese / Português" },
                  { value: "zh", label: "Chinese / 中文" },
                  { value: "ja", label: "Japanese / 日本語" },
                  { value: "ar", label: "Arabic / العربية" },
                  { value: "hi", label: "Hindi / हिन्दी" },
                  { value: "ko", label: "Korean / 한국어" },
                  { value: "it", label: "Italian / Italiano" },
                  { value: "nl", label: "Dutch / Nederlands" },
                ]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Apply threshold (default 3.5)"
                name="eval_score_apply"
                type="number"
                placeholder="3.5"
                defaultValue={profile?.eval_score_apply ?? 3.5}
              />
              <InputField
                label="Watch threshold (default 2.5)"
                name="eval_score_watch"
                type="number"
                placeholder="2.5"
                defaultValue={profile?.eval_score_watch ?? 2.5}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Scores above the Apply threshold get "apply" — between thresholds get "watch" — below Watch get "skip"
            </p>

            <InputField
              label="Custom evaluation focus (optional)"
              name="custom_eval_focus"
              placeholder="e.g. Prioritise companies with strong remote culture. Weight AI/ML stack experience highly. Flag any role that requires travel."
              textarea
              rows={4}
              defaultValue={profile?.custom_eval_focus ?? ""}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Plain English instructions injected into every evaluation. Use to personalise scoring for your specific priorities.
            </p>

            <InputField
              label="Custom archetypes (comma-separated, optional)"
              name="custom_archetypes"
              placeholder="e.g. AI Infrastructure, Applied ML, Developer Relations"
              defaultValue={profile?.custom_archetypes?.join(", ") ?? ""}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Overrides the default archetype list used during evaluation. Leave blank to use defaults.
            </p>
          </div>
        </Surface>

        {/* Base CV */}
        <Surface className={cvMissing ? "p-5 border-[var(--accent)]" : "p-5"}>
          <SectionTitle
            title="Base CV"
            subtitle="Paste your full CV text — used verbatim in every evaluation prompt"
          />
          <InputField
            label="CV text"
            name="base_cv"
            placeholder="Paste your full CV here (plain text is fine)..."
            textarea
            rows={18}
            defaultValue={profile?.base_cv ?? ""}
          />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Plain text or markdown. No PDF — just paste the text content.
          </p>
        </Surface>

        <div className="flex gap-3">
          <Button type="submit" tone="accent">
            Save profile
          </Button>
        </div>
      </form>

    </div>
  );
}
