"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type Tone = "default" | "accent" | "ok" | "warn" | "bad";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Surface({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  const tones: Record<Tone, string> = {
    default: "border-[var(--line)] bg-[var(--surface)]",
    accent: "border-[var(--accent)] bg-[#fcefe7]",
    ok: "border-[var(--ok)] bg-[#eef8f0]",
    warn: "border-[var(--warn)] bg-[#faf2df]",
    bad: "border-[var(--bad)] bg-[#faebeb]",
  };

  return (
    <div
      className={cx(
        "rounded-[22px] border shadow-[2px_3px_0_rgba(26,24,20,0.08)]",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cx(
        "font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Display({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cx(
        "font-[var(--font-caveat)] text-4xl font-bold leading-none tracking-tight sm:text-6xl",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
  fill = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  fill?: boolean;
  className?: string;
}) {
  const styles: Record<Tone, string> = {
    default: fill
      ? "border-transparent bg-[var(--surface-ink)] text-[var(--surface)]"
      : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)]",
    accent: fill
      ? "border-transparent bg-[var(--accent)] text-[var(--surface)]"
      : "border-[var(--accent)] bg-[#fcefe7] text-[var(--accent)]",
    ok: fill
      ? "border-transparent bg-[var(--ok)] text-[var(--surface)]"
      : "border-[var(--ok)] bg-[#eef8f0] text-[var(--ok)]",
    warn: fill
      ? "border-transparent bg-[var(--warn)] text-[var(--surface)]"
      : "border-[var(--warn)] bg-[#faf2df] text-[var(--warn)]",
    bad: fill
      ? "border-transparent bg-[var(--bad)] text-[var(--surface)]"
      : "border-[var(--bad)] bg-[#faebeb] text-[var(--bad)]",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
        styles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  href,
  tone = "default",
  ghost = false,
  className,
  type,
  onClick,
  disabled,
}: {
  children: ReactNode;
  href?: string;
  tone?: Tone;
  ghost?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5";
  const tones: Record<Tone, string> = {
    default: ghost
      ? "border-[var(--line)] bg-transparent text-[var(--foreground)]"
      : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)]",
    accent: ghost
      ? "border-[var(--accent)] bg-transparent text-[var(--accent)]"
      : "border-[var(--accent)] bg-[var(--accent)] text-[var(--surface)]",
    ok: ghost
      ? "border-[var(--ok)] bg-transparent text-[var(--ok)]"
      : "border-[var(--ok)] bg-[var(--ok)] text-[var(--surface)]",
    warn: ghost
      ? "border-[var(--warn)] bg-transparent text-[var(--warn)]"
      : "border-[var(--warn)] bg-[var(--warn)] text-[var(--surface)]",
    bad: ghost
      ? "border-[var(--bad)] bg-transparent text-[var(--bad)]"
      : "border-[var(--bad)] bg-[var(--bad)] text-[var(--surface)]",
  };

  if (href) {
    return (
      <Link href={href} className={cx(base, tones[tone], className)}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(base, tones[tone], disabled && "opacity-50 cursor-not-allowed", className)}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: Tone;
}) {
  return (
    <Surface tone={tone} className="p-4">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 font-[var(--font-caveat)] text-4xl font-bold leading-none">
        {value}
      </p>
      {sublabel ? (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {sublabel}
        </p>
      ) : null}
    </Surface>
  );
}

export function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-3">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--line)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--surface-soft)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-dashed border-[var(--line-soft)] last:border-b-0"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 align-top text-sm">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KanbanBoard({
  columns,
}: {
  columns: ReadonlyArray<{
    title: string;
    items: ReadonlyArray<string>;
  }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {columns.map((column) => (
        <div
          key={column.title}
          className="rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-3"
        >
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>{column.title}</Eyebrow>
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {column.items.length}
            </span>
          </div>
          <div className="space-y-3">
            {column.items.map((item) => (
              <div
                key={item}
                className="rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm shadow-[1px_1px_0_rgba(26,24,20,0.08)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: Array<{ title: string; subtitle: string; time?: string }>;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={`${item.title}-${item.subtitle}`} className="flex gap-4">
          <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" />
          <div className="flex-1 border-b border-dashed border-[var(--line-soft)] pb-4 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold">{item.title}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {item.subtitle}
                </p>
              </div>
              {item.time ? (
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  {item.time}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InputField({
  label,
  placeholder,
  textarea = false,
  name,
  type = "text",
  defaultValue,
  rows = 5,
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
  name?: string;
  type?: string;
  defaultValue?: string | number;
  rows?: number;
}) {
  return (
    <label className="block">
      <Eyebrow className="mb-2 block">{label}</Eyebrow>
      {textarea ? (
        <textarea
          name={name}
          rows={rows}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
        />
      )}
    </label>
  );
}

export function TabbedPanel({
  tabs,
}: {
  tabs: Array<{ id: string; label: string; content: ReactNode }>;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = useMemo(
    () => tabs.find((tab) => tab.id === active) ?? tabs[0],
    [active, tabs],
  );

  return (
    <Surface className="overflow-hidden">
      <div className="overflow-x-auto border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <div className="flex min-w-max gap-1 px-2 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-bold transition",
                active === tab.id
                  ? "bg-[var(--accent)] text-[var(--surface)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">{current?.content}</div>
    </Surface>
  );
}

export function TogglePills({
  items,
  initial,
}: {
  items: string[];
  initial?: string;
}) {
  const [active, setActive] = useState(initial ?? items[0]);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => setActive(item)}
          className={cx(
            "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]",
            active === item
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--surface)]"
              : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)]",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Surface className="border-dashed p-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted-foreground)]">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Surface>
  );
}
