"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Display,
  EmptyState,
  Eyebrow,
  StatCard,
  Surface,
} from "@/components/nextrole/ui";
import {
  createStoryEntry,
  deleteStoryEntry,
  markStoryReady,
} from "@/app/actions/story-bank";
import type { StoryBankEntryRow, JobRow } from "@/lib/db/types";

export type StoryWithJob = StoryBankEntryRow & {
  jobs: Pick<JobRow, "title" | "company"> | null;
};

const DIFFICULTY_TONE: Record<string, "ok" | "warn" | "bad"> = {
  easy: "ok",
  medium: "warn",
  hard: "bad",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Story card ──────────────────────────────────────────────────────────────

function StoryCard({ story }: { story: StoryWithJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Surface className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Badge tone={story.status === "ready" ? "ok" : "default"}>
            {story.status}
          </Badge>
          <Badge tone={DIFFICULTY_TONE[story.difficulty] ?? "default"}>
            {story.difficulty}
          </Badge>
          <div className="min-w-0">
            <p className="font-semibold truncate">{story.title}</p>
            {story.jobs && (
              <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                {story.jobs.title} @ {story.jobs.company}
              </p>
            )}
            {story.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {story.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button tone="default" ghost onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Collapse" : "View"}
          </Button>
          <form action={markStoryReady}>
            <input type="hidden" name="id" value={story.id} />
            <input
              type="hidden"
              name="status"
              value={story.status === "ready" ? "draft" : "ready"}
            />
            <Button type="submit" tone={story.status === "ready" ? "default" : "ok"} ghost>
              {story.status === "ready" ? "Mark draft" : "Mark ready"}
            </Button>
          </form>
          <form action={deleteStoryEntry}>
            <input type="hidden" name="id" value={story.id} />
            <Button type="submit" tone="default" ghost>
              Remove
            </Button>
          </form>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-dashed border-[var(--line-soft)] pt-4">
          {[
            { label: "Situation", value: story.situation },
            { label: "Task", value: story.task },
            { label: "Action", value: story.action },
            { label: "Result", value: story.result },
            { label: "Reflection", value: story.reflection },
          ].map(({ label, value }) =>
            value ? (
              <div key={label}>
                <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {label}
                </p>
                <p className="text-sm leading-relaxed">{value}</p>
              </div>
            ) : null,
          )}
          <p className="font-mono text-[9px] text-[var(--muted-foreground)]">
            Added {formatDate(story.created_at)}
          </p>
        </div>
      )}
    </Surface>
  );
}

// ── Add story form ──────────────────────────────────────────────────────────

function AddStoryForm({
  jobs,
  onClose,
}: {
  jobs: Array<Pick<JobRow, "id" | "title" | "company">>;
  onClose: () => void;
}) {
  return (
    <Surface className="p-5">
      <h2 className="mb-4 text-base font-bold">Add story</h2>
      <form action={createStoryEntry} className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            name="title"
            placeholder="Story title (e.g. Led migration to microservices)"
            required
            className="min-w-[240px] flex-1 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <select
            name="difficulty"
            className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            name="job_id"
            className="min-w-[200px] flex-1 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">No linked job</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {j.company}
              </option>
            ))}
          </select>
        </div>
        {[
          { name: "situation", placeholder: "Situation — the context and challenge" },
          { name: "task", placeholder: "Task — what you were responsible for" },
          { name: "action", placeholder: "Action — the specific steps you took" },
          { name: "result", placeholder: "Result — quantified outcomes and impact" },
          { name: "reflection", placeholder: "Reflection — what you learned and how it applies" },
        ].map(({ name, placeholder }) => (
          <textarea
            key={name}
            name={name}
            placeholder={placeholder}
            rows={2}
            className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        ))}
        <input
          name="tags"
          placeholder="Tags (comma-separated): leadership, python, cross-functional"
          className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <div className="flex gap-2">
          <Button type="submit" tone="accent">Save story</Button>
          <Button type="button" tone="default" ghost onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Surface>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function StoryBankPageContent({
  stories,
  jobs,
  error: pageError,
  message: pageMessage,
}: {
  stories: StoryWithJob[];
  jobs: Array<Pick<JobRow, "id" | "title" | "company">>;
  error?: string;
  message?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [generatingJobId, setGeneratingJobId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genDone, setGenDone] = useState(false);

  const readyCount = stories.filter((s) => s.status === "ready").length;
  const draftCount = stories.filter((s) => s.status === "draft").length;

  async function generateStory() {
    if (!generatingJobId) return;
    setGenerating(true);
    setGenError(null);
    setGenDone(false);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: generatingJobId }),
      });
      const data = (await res.json()) as { entry_id?: string; error?: string };
      if (!res.ok || data.error) {
        setGenError(data.error ?? "Generation failed");
      } else {
        setGenDone(true);
        setTimeout(() => window.location.reload(), 800);
      }
    } catch {
      setGenError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Story Bank</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Build your STAR+Reflection interview story library. Add stories manually or generate
          them from job evaluation intelligence.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total stories" value={String(stories.length)} sublabel="in library" />
        <StatCard
          label="Ready"
          value={String(readyCount)}
          sublabel="polished stories"
          tone={readyCount > 0 ? "ok" : "default"}
        />
        <StatCard label="Drafts" value={String(draftCount)} sublabel="in progress" />
      </div>

      {pageError && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {pageError}
        </p>
      )}
      {pageMessage && (
        <p className="rounded-[14px] border border-[var(--ok)] bg-[#eef8f0] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ok)]">
          {pageMessage}
        </p>
      )}

      {/* Actions row */}
      <div className="flex flex-wrap items-end gap-4">
        <Button tone="accent" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add story"}
        </Button>

        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={generatingJobId}
              onChange={(e) => setGeneratingJobId(e.target.value)}
              className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">Select job for AI story…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
            <Button
              tone="default"
              onClick={generateStory}
              disabled={!generatingJobId || generating}
            >
              {generating ? "Generating…" : genDone ? "Done ✓" : "Generate story"}
            </Button>
          </div>
        )}
      </div>

      {genError && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {genError}
        </p>
      )}

      {showForm && (
        <AddStoryForm jobs={jobs} onClose={() => setShowForm(false)} />
      )}

      {stories.length === 0 && !showForm ? (
        <EmptyState
          title="No stories yet"
          body="Add your first STAR story above, or generate one from a job evaluation."
        />
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
