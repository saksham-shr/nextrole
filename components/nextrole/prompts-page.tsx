"use client";

import { useState, useTransition } from "react";
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
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from "@/app/actions/prompt-templates";
import type { PromptTemplateRow } from "@/lib/db/types";

const WORKFLOW_OPTIONS = [
  { value: "evaluate", label: "Evaluate" },
  { value: "scan", label: "Scan" },
  { value: "resume", label: "Resume" },
  { value: "interview", label: "Interview Prep" },
  { value: "apply", label: "Apply" },
  { value: "followup", label: "Follow-up" },
  { value: "negotiate", label: "Negotiate" },
  { value: "deep", label: "Deep Research" },
  { value: "other", label: "Other" },
];

function workflowLabel(value: string) {
  return WORKFLOW_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function workflowTone(value: string): "accent" | "ok" | "warn" | "default" {
  const map: Record<string, "accent" | "ok" | "warn" | "default"> = {
    evaluate: "accent",
    resume: "ok",
    interview: "ok",
    apply: "warn",
    negotiate: "warn",
  };
  return map[value] ?? "default";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Button ghost onClick={copy}>
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

function TemplateForm({
  initial,
  onCancel,
  onDone,
  isEdit,
}: {
  initial?: PromptTemplateRow;
  onCancel: () => void;
  onDone: (error?: string) => void;
  isEdit?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(async () => {
      const result = isEdit
        ? await updatePromptTemplate(fd)
        : await createPromptTemplate(fd);
      if (result.error) {
        setErr(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={initial?.id} />}

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          Name *
        </label>
        <input
          name="name"
          required
          defaultValue={initial?.name}
          className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder="e.g. Senior IC evaluator"
        />
      </div>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          Workflow
        </label>
        <select
          name="workflow"
          defaultValue={initial?.workflow ?? "evaluate"}
          className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {WORKFLOW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          Description
        </label>
        <input
          name="description"
          defaultValue={initial?.description ?? ""}
          className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder="Short description of when to use this template"
        />
      </div>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          Template *
        </label>
        <textarea
          name="template"
          required
          defaultValue={initial?.template}
          rows={8}
          className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder="Write your prompt template here. Use {{variable}} placeholders as needed."
        />
      </div>

      {err && (
        <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {err}
        </p>
      )}

      <div className="flex gap-2">
        <Button tone="accent" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create template"}
        </Button>
        <Button ghost onClick={onCancel} type="button">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <Button ghost onClick={() => setConfirm(true)}>
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--bad)]">
        Sure?
      </span>
      <Button
        ghost
        onClick={() => {
          startTransition(async () => {
            const fd = new FormData();
            fd.set("id", id);
            await deletePromptTemplate(fd);
            onDone();
          });
        }}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button ghost onClick={() => setConfirm(false)}>
        Cancel
      </Button>
    </div>
  );
}

export function PromptsPageContent({
  templates: initial,
}: {
  templates: PromptTemplateRow[];
}) {
  const [templates, setTemplates] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const byWorkflow = WORKFLOW_OPTIONS.filter((o) =>
    templates.some((t) => t.workflow === o.value)
  );

  return (
    <div className="space-y-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>NextRole workspace</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">Prompt Templates</Display>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            Save and reuse custom prompts across any workflow — evaluate, scan, resume, and more.
          </p>
        </div>
        {!creating && (
          <Button tone="accent" onClick={() => setCreating(true)}>
            + New template
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={String(templates.length)} sublabel="saved templates" />
        {WORKFLOW_OPTIONS.slice(0, 3).map((o) => (
          <StatCard
            key={o.value}
            label={o.label}
            value={String(templates.filter((t) => t.workflow === o.value).length)}
            sublabel="templates"
          />
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <Surface className="p-5">
          <h2 className="mb-4 text-base font-bold">New prompt template</h2>
          <TemplateForm
            onCancel={() => setCreating(false)}
            onDone={(err) => {
              if (!err) {
                setCreating(false);
                // Reload via router would need server; we rely on revalidatePath
                // For immediate feedback, just close — parent will re-fetch on next nav
              }
            }}
          />
        </Surface>
      )}

      {/* List */}
      {templates.length === 0 && !creating ? (
        <EmptyState
          title="No templates yet"
          body="Create a prompt template to reuse across evaluate, scan, and other workflows."
        />
      ) : (
        <div className="space-y-3">
          {byWorkflow.map(({ value, label }) => {
            const group = templates.filter((t) => t.workflow === value);
            if (group.length === 0) return null;
            return (
              <div key={value} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  {label}
                </p>
                {group.map((t) => {
                  const isExpanded = expandedId === t.id;
                  const isEditing = editingId === t.id;
                  return (
                    <Surface key={t.id} className="p-4">
                      {isEditing ? (
                        <div>
                          <h3 className="mb-4 font-semibold">Edit: {t.name}</h3>
                          <TemplateForm
                            initial={t}
                            isEdit
                            onCancel={() => setEditingId(null)}
                            onDone={() => setEditingId(null)}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <Badge tone={workflowTone(t.workflow)}>
                                {workflowLabel(t.workflow)}
                              </Badge>
                              <div>
                                <p className="font-semibold">{t.name}</p>
                                {t.description && (
                                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                                    {t.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <CopyButton text={t.template} />
                              <Button
                                ghost
                                onClick={() => setExpandedId(isExpanded ? null : t.id)}
                              >
                                {isExpanded ? "Hide" : "Preview"}
                              </Button>
                              <Button ghost onClick={() => setEditingId(t.id)}>
                                Edit
                              </Button>
                              <DeleteButton
                                id={t.id}
                                onDone={() =>
                                  setTemplates((prev) => prev.filter((x) => x.id !== t.id))
                                }
                              />
                            </div>
                          </div>
                          {isExpanded && (
                            <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[var(--background)] p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]">
                              {t.template}
                            </pre>
                          )}
                        </>
                      )}
                    </Surface>
                  );
                })}
              </div>
            );
          })}

          {/* Templates with unmapped workflow */}
          {templates
            .filter((t) => !WORKFLOW_OPTIONS.some((o) => o.value === t.workflow))
            .map((t) => {
              const isExpanded = expandedId === t.id;
              const isEditing = editingId === t.id;
              return (
                <Surface key={t.id} className="p-4">
                  {isEditing ? (
                    <div>
                      <h3 className="mb-4 font-semibold">Edit: {t.name}</h3>
                      <TemplateForm
                        initial={t}
                        isEdit
                        onCancel={() => setEditingId(null)}
                        onDone={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Badge>{t.workflow}</Badge>
                          <div>
                            <p className="font-semibold">{t.name}</p>
                            {t.description && (
                              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CopyButton text={t.template} />
                          <Button
                            ghost
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          >
                            {isExpanded ? "Hide" : "Preview"}
                          </Button>
                          <Button ghost onClick={() => setEditingId(t.id)}>
                            Edit
                          </Button>
                          <DeleteButton
                            id={t.id}
                            onDone={() =>
                              setTemplates((prev) => prev.filter((x) => x.id !== t.id))
                            }
                          />
                        </div>
                      </div>
                      {isExpanded && (
                        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[var(--background)] p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]">
                          {t.template}
                        </pre>
                      )}
                    </>
                  )}
                </Surface>
              );
            })}
        </div>
      )}
    </div>
  );
}
