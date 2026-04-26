"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Eyebrow,
  MiniMetric,
  SectionTitle,
  Surface,
} from "@/components/nextrole/ui";
import { saveProviderKey, removeProvider } from "@/app/actions/providers";
import type { ProviderType } from "@/lib/db/types";

export type CredentialInfo = {
  provider: ProviderType;
  model: string | null;
  is_active: boolean;
  last_used_at: string | null;
  key_hint: string | null;
};

const ANTHROPIC_MODELS = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7 (best)" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (fast)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (cheapest)" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (best)" },
  { value: "gpt-4o-mini", label: "GPT-4o mini (fast)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "o1", label: "o1 (reasoning)" },
  { value: "o1-mini", label: "o1-mini (reasoning, fast)" },
];

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (fastest)" },
  { value: "gemini-2.0-pro-exp", label: "Gemini 2.0 Pro (best)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
];

const selectClass =
  "w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]";

function ProviderCard({
  name,
  provider,
  credential,
  models,
  keyPlaceholder,
  docsUrl,
  docsLabel,
}: {
  name: string;
  provider: ProviderType;
  credential: CredentialInfo | null;
  models: { value: string; label: string }[];
  keyPlaceholder: string;
  docsUrl: string;
  docsLabel: string;
}) {
  const [showForm, setShowForm] = useState(credential === null);
  const isConnected = credential !== null;

  return (
    <Surface tone={isConnected ? "ok" : "default"} className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Eyebrow>API</Eyebrow>
          <h3 className="mt-2 text-lg font-bold">{name}</h3>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] underline hover:text-[var(--foreground)]"
          >
            {docsLabel}
          </a>
        </div>
        <Badge tone={isConnected ? "ok" : "default"}>
          {isConnected ? "Connected" : "Not connected"}
        </Badge>
      </div>

      {isConnected && !showForm && (
        <div className="mt-4 grid gap-3">
          <MiniMetric label="Key" value={credential.key_hint ?? "••••••••••••"} />
          <MiniMetric label="Model" value={credential.model ?? "—"} />
          <MiniMetric
            label="Last used"
            value={
              credential.last_used_at
                ? new Date(credential.last_used_at).toLocaleDateString()
                : "Never"
            }
          />
        </div>
      )}

      {showForm && (
        <form action={saveProviderKey} className="mt-4 space-y-3">
          <input type="hidden" name="provider" value={provider} />
          <label className="block">
            <Eyebrow className="mb-2 block">API key</Eyebrow>
            <input
              name="key"
              type="password"
              required
              placeholder={keyPlaceholder}
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <Eyebrow className="mb-2 block">Model</Eyebrow>
            <select
              name="model"
              defaultValue={credential?.model ?? models[0]?.value}
              className={selectClass}
            >
              {models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" tone="accent">Save key</Button>
            {isConnected && (
              <Button type="button" ghost onClick={() => setShowForm(false)}>Cancel</Button>
            )}
          </div>
        </form>
      )}

      {isConnected && !showForm && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setShowForm(true)}>Update key</Button>
          <form action={removeProvider}>
            <input type="hidden" name="provider" value={provider} />
            <Button type="submit" tone="bad" ghost>Remove</Button>
          </form>
        </div>
      )}
    </Surface>
  );
}

function ManualCard() {
  return (
    <Surface tone="accent" className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Eyebrow>Manual</Eyebrow>
          <h3 className="mt-2 text-lg font-bold">Manual Chat Mode</h3>
        </div>
        <Badge tone="accent">Always on</Badge>
      </div>
      <div className="mt-4 grid gap-3">
        <MiniMetric label="Mode" value="Prompt export + result import" />
        <MiniMetric label="Works with" value="Claude Pro / ChatGPT Plus / Gemini Advanced" />
        <MiniMetric label="No quota" value="Runs inside your own chat session" />
      </div>
      <div className="mt-5">
        <Button href="/dashboard/evaluate" tone="accent">Try manual evaluate</Button>
      </div>
    </Surface>
  );
}

export function ProvidersPageContent({
  credentials,
  error,
  message,
}: {
  credentials: CredentialInfo[];
  error?: string;
  message?: string;
}) {
  const anthropic = credentials.find((c) => c.provider === "anthropic") ?? null;
  const openai = credentials.find((c) => c.provider === "openai") ?? null;
  const gemini = credentials.find((c) => c.provider === "gemini") ?? null;

  const connectedCount = [anthropic, openai, gemini].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-[14px] border border-[var(--ok)] bg-[#eef8f0] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ok)]">
          {message}
        </p>
      )}

      <Surface className="p-5">
        <SectionTitle
          title="AI Providers"
          subtitle={`${connectedCount} of 3 connected — manual mode always available`}
        />
        <p className="text-sm text-[var(--muted-foreground)]">
          Connect one or more providers. The most recently updated active credential is used for each AI workflow.
          You can switch any time by updating or removing keys below.
        </p>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <ProviderCard
          name="Anthropic"
          provider="anthropic"
          credential={anthropic}
          models={ANTHROPIC_MODELS}
          keyPlaceholder="sk-ant-api03-..."
          docsUrl="https://console.anthropic.com/settings/keys"
          docsLabel="Get key → console.anthropic.com"
        />
        <ProviderCard
          name="OpenAI"
          provider="openai"
          credential={openai}
          models={OPENAI_MODELS}
          keyPlaceholder="sk-proj-..."
          docsUrl="https://platform.openai.com/api-keys"
          docsLabel="Get key → platform.openai.com"
        />
        <ProviderCard
          name="Google Gemini"
          provider="gemini"
          credential={gemini}
          models={GEMINI_MODELS}
          keyPlaceholder="AIza..."
          docsUrl="https://aistudio.google.com/app/apikey"
          docsLabel="Get key → aistudio.google.com"
        />
        <ManualCard />
      </div>

      <Surface className="p-5">
        <SectionTitle title="Manual mode guide" subtitle="Prompt export and result import" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MiniMetric label="Generate prompt" value="Copyable system + user prompt package" />
          <MiniMetric label="Paste result" value="Validated JSON import back into the workflow" />
          <MiniMetric label="Works for" value="All 10 AI workflows — evaluate, compare, apply, deep, contact, training, project, follow-up, resume, interview prep" />
          <MiniMetric label="Why it exists" value="Claude Pro / ChatGPT Plus / Gemini Advanced are not quota — use them free" />
        </div>
      </Surface>
    </div>
  );
}
