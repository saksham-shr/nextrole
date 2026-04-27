"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Display,
  Eyebrow,
  InputField,
  SectionTitle,
  Surface,
} from "@/components/nextrole/ui";
import { saveProfileStep } from "@/app/actions/profile";
import { BrandMark } from "@/components/nextrole/brand";

// ─── Step definitions ─────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const STEP_LABELS = [
  "Welcome",
  "About you",
  "Your CV",
  "Targeting",
  "All set",
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition ${
                i < current
                  ? "border-[var(--ok)] bg-[var(--ok)] text-white"
                  : i === current
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-foreground)]"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`hidden font-mono text-[9px] uppercase tracking-[0.14em] sm:block ${
                i === current ? "text-[var(--foreground)]" : "text-[var(--muted-foreground-2)]"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      {/* Connector line */}
      <div className="relative h-1 rounded-full bg-[var(--line-soft)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${(current / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step 0: Welcome ─────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]">
          <BrandMark className="h-8 w-8" strokeClassName="text-white" />
        </div>
        <Display className="text-4xl sm:text-5xl">Welcome to NextRole</Display>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          This quick setup takes about 3 minutes and unlocks every AI workflow —
          evaluation scoring, resume tailoring, interview prep, and negotiation coaching.
        </p>
      </div>

      <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
        {[
          { icon: "⚡", title: "Evaluate jobs instantly", body: "Paste a URL or JD and get a scored fit analysis with apply/skip signal." },
          { icon: "📄", title: "Generate tailored resumes", body: "Your base CV + job description = a targeted resume in seconds." },
          { icon: "🎯", title: "Track your pipeline", body: "Kanban + urgency queue keeps your whole search organised." },
          { icon: "💬", title: "Prep for interviews", body: "Round-by-round packs built from your stories and the role requirements." },
        ].map(({ icon, title, body }) => (
          <div
            key={title}
            className="rounded-[18px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4 text-left"
          >
            <p className="mb-1 text-xl">{icon}</p>
            <p className="text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">{body}</p>
          </div>
        ))}
      </div>

      <Button tone="accent" onClick={onNext} className="mx-auto">
        Get started →
      </Button>
    </div>
  );
}

// ─── Step 1: Basics ───────────────────────────────────────────────────────────

function StepBasics({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    full_name: "",
    years_experience: "",
    seniority: "",
    work_mode: "",
  });

  function set(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!fields.full_name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveProfileStep({
        full_name: fields.full_name.trim() || null,
        years_experience: fields.years_experience ? parseInt(fields.years_experience, 10) : null,
        seniority: fields.seniority || null,
        work_mode: (fields.work_mode as "remote" | "hybrid" | "onsite") || null,
      });
      if (result.ok) onNext();
      else setError(result.error ?? "Save failed");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <Display className="text-3xl sm:text-4xl">About you</Display>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
          This shapes how the AI interprets your experience and job fit.
        </p>
      </div>

      {error && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {error}
        </p>
      )}

      <Surface className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Full name"
            name="full_name"
            placeholder="Alex Johnson"
            value={fields.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
          <InputField
            label="Years of experience"
            name="years_experience"
            type="number"
            placeholder="8"
            value={fields.years_experience}
            onChange={(e) => set("years_experience", e.target.value)}
          />

          <label className="block">
            <Eyebrow className="mb-2 block">Seniority</Eyebrow>
            <select
              value={fields.seniority}
              onChange={(e) => set("seniority", e.target.value)}
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">— select —</option>
              <option value="junior">Junior (0–2 yrs)</option>
              <option value="mid">Mid-level (2–5 yrs)</option>
              <option value="senior">Senior (5–8 yrs)</option>
              <option value="staff">Staff / Principal (8+ yrs)</option>
              <option value="principal">Distinguished / Fellow</option>
            </select>
          </label>

          <label className="block">
            <Eyebrow className="mb-2 block">Work mode</Eyebrow>
            <select
              value={fields.work_mode}
              onChange={(e) => set("work_mode", e.target.value)}
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">— select —</option>
              <option value="remote">Remote only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </label>
        </div>
      </Surface>

      <div className="flex gap-3">
        <Button ghost onClick={onBack}>← Back</Button>
        <Button tone="accent" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Continue →"}
        </Button>
        <Button ghost onClick={onNext} className="ml-auto text-[var(--muted-foreground)]">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: CV ───────────────────────────────────────────────────────────────

function StepCv({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [cvText, setCvText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wordCount = cvText.trim() ? cvText.trim().split(/\s+/).length : 0;

  function submit() {
    if (!cvText.trim()) {
      setError("Please paste your CV before continuing");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveProfileStep({ base_cv: cvText.trim() });
      if (result.ok) onNext();
      else setError(result.error ?? "Save failed");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <Display className="text-3xl sm:text-4xl">Your CV</Display>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
          Paste your CV as plain text — the AI reads this verbatim in every evaluation and resume
          generation. You can always update it in the CV page later.
        </p>
      </div>

      {error && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {error}
        </p>
      )}

      <Surface className="p-5">
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          rows={18}
          placeholder={`Alex Johnson · alex@email.com · London\n\nSUMMARY\nSenior engineer with 8 years building...\n\nEXPERIENCE\nStaff Engineer · Acme Corp · 2021–present\n• Led migration of monolith to microservices, reducing deploy time by 60%\n\nSKILLS\nTypeScript, Python, Go, PostgreSQL, Kubernetes`}
          className="w-full resize-y rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-4 font-mono text-[12px] leading-6 outline-none focus:border-[var(--accent)]"
        />
        {wordCount > 0 && (
          <div className="mt-2 flex items-center gap-3">
            <Badge tone={wordCount >= 400 ? "ok" : "warn"}>{wordCount} words</Badge>
            {wordCount < 400 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--warn)]">
                Aim for 400+ words for best results
              </span>
            )}
          </div>
        )}
      </Surface>

      <div className="flex gap-3">
        <Button ghost onClick={onBack}>← Back</Button>
        <Button tone="accent" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Continue →"}
        </Button>
        <Button ghost onClick={onNext} className="ml-auto text-[var(--muted-foreground)]">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Targeting ────────────────────────────────────────────────────────

function StepTargeting({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    target_roles: "",
    target_locations: "",
    current_comp: "",
    comp_min: "",
    comp_max: "",
  });

  function set(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function parseNum(s: string): number | null {
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? null : n;
  }

  function parseArr(s: string): string[] | null {
    const arr = s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return arr.length ? arr : null;
  }

  function submit() {
    startTransition(async () => {
      const result = await saveProfileStep({
        target_roles: parseArr(fields.target_roles),
        target_locations: parseArr(fields.target_locations),
        current_comp: parseNum(fields.current_comp),
        comp_min: parseNum(fields.comp_min),
        comp_max: parseNum(fields.comp_max),
      });
      if (result.ok) onNext();
      else setError(result.error ?? "Save failed");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <Display className="text-3xl sm:text-4xl">Targeting</Display>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
          Compensation and role targets power evaluation scoring and negotiation analysis. You can
          refine these anytime in Profile.
        </p>
      </div>

      {error && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {error}
        </p>
      )}

      <Surface className="p-5 space-y-4">
        <SectionTitle title="Role targets" subtitle="Comma-separated" />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Target roles"
            name="target_roles"
            placeholder="Staff Engineer, Principal Engineer, EM"
            value={fields.target_roles}
            onChange={(e) => set("target_roles", e.target.value)}
          />
          <InputField
            label="Target locations"
            name="target_locations"
            placeholder="London, Remote, Berlin"
            value={fields.target_locations}
            onChange={(e) => set("target_locations", e.target.value)}
          />
        </div>

        <SectionTitle title="Compensation" subtitle="Same currency throughout (£ / $ / €)" />
        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            label="Current total comp"
            name="current_comp"
            type="number"
            placeholder="95000"
            value={fields.current_comp}
            onChange={(e) => set("current_comp", e.target.value)}
          />
          <InputField
            label="Minimum target"
            name="comp_min"
            type="number"
            placeholder="120000"
            value={fields.comp_min}
            onChange={(e) => set("comp_min", e.target.value)}
          />
          <InputField
            label="Maximum target"
            name="comp_max"
            type="number"
            placeholder="180000"
            value={fields.comp_max}
            onChange={(e) => set("comp_max", e.target.value)}
          />
        </div>
      </Surface>

      <div className="flex gap-3">
        <Button ghost onClick={onBack}>← Back</Button>
        <Button tone="accent" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Continue →"}
        </Button>
        <Button ghost onClick={onNext} className="ml-auto text-[var(--muted-foreground)]">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function StepDone({
  hasProvider,
  onBack,
}: {
  hasProvider: boolean;
  onBack: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ok)] text-white text-2xl">
          ✓
        </div>
        <Display className="text-3xl sm:text-4xl">You&apos;re set up</Display>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">
          Profile saved. Your first evaluation is one paste away.
        </p>
      </div>

      {!hasProvider && (
        <Surface tone="warn" className="p-5 text-left">
          <SectionTitle
            title="One more thing — add an AI provider key"
            subtitle="Without a key, AI features use manual mode (copy-paste to Claude/ChatGPT)"
          />
          <Button href="/dashboard/providers" tone="accent" className="mt-3">
            Add Anthropic or OpenAI key →
          </Button>
        </Surface>
      )}

      <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
        <button
          onClick={() => router.push("/dashboard/evaluate")}
          className="rounded-[18px] border border-[var(--accent)] bg-[#fcefe7] p-5 text-left transition hover:shadow-md"
        >
          <p className="text-xl">⚡</p>
          <p className="mt-2 font-bold">Evaluate a job</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Paste a JD and get scored fit analysis
          </p>
        </button>
        <button
          onClick={() => router.push("/dashboard/pipeline")}
          className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-5 text-left transition hover:shadow-md"
        >
          <p className="text-xl">📋</p>
          <p className="mt-2 font-bold">Add a job manually</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Start building your pipeline
          </p>
        </button>
      </div>

      <div className="flex justify-center gap-3">
        <Button ghost onClick={onBack}>← Back</Button>
        <Button href="/dashboard" tone="accent">
          Go to dashboard →
        </Button>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function OnboardingPageContent({ hasProvider }: { hasProvider: boolean }) {
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto max-w-2xl py-6">
      <StepBar current={step} />

      {step === 0 && <StepWelcome onNext={next} />}
      {step === 1 && <StepBasics onNext={next} onBack={back} />}
      {step === 2 && <StepCv onNext={next} onBack={back} />}
      {step === 3 && <StepTargeting onNext={next} onBack={back} />}
      {step === 4 && <StepDone hasProvider={hasProvider} onBack={back} />}
    </div>
  );
}
