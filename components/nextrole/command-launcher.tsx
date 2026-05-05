"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { navGroups, quickActions } from "@/lib/nextrole-data";
import { canAccess } from "@/lib/ai/gates";
import type { UserTier } from "@/lib/db/types";

// ─── Item index ───────────────────────────────────────────────────────────────

type CommandItem = {
  label: string;
  href: string;
  group: string;
  keywords?: string;
};

const ACTION_ITEMS: CommandItem[] = quickActions.map((a) => ({
  label: a.label,
  href: a.href,
  group: "Quick actions",
}));

function buildNavItems(tier: UserTier): CommandItem[] {
  return navGroups.flatMap((group) =>
    group.items
      .filter((item) => !item.feature || canAccess(tier, item.feature))
      .map((item) => ({ label: item.label, href: item.href, group: group.title })),
  );
}

function filterItems(query: string, tier: UserTier): CommandItem[] {
  const all = [...ACTION_ITEMS, ...buildNavItems(tier)];
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.href.toLowerCase().includes(q) ||
      (item.keywords ?? "").toLowerCase().includes(q),
  );
}

// ─── Launcher modal ───────────────────────────────────────────────────────────

function LauncherModal({
  onClose,
  tier,
}: {
  onClose: () => void;
  tier: UserTier;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = filterItems(query, tier);

  // Auto-focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset cursor when results change
  useEffect(() => {
    setCursor(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function navigate(item: CommandItem) {
    router.push(item.href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[cursor]) navigate(results[cursor]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  // Group consecutive items with same group label
  type GroupedSection = { group: string; items: Array<CommandItem & { index: number }> };
  const grouped: GroupedSection[] = [];
  let absoluteIndex = 0;
  for (const item of results) {
    const last = grouped[grouped.length - 1];
    if (last && last.group === item.group) {
      last.items.push({ ...item, index: absoluteIndex });
    } else {
      grouped.push({ group: item.group, items: [{ ...item, index: absoluteIndex }] });
    }
    absoluteIndex++;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(26,24,20,0.4)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-3 top-16 z-50 mx-auto max-w-xl overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[4px_6px_0_rgba(26,24,20,0.14)]">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <span className="text-[var(--muted-foreground)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, tools…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          />
          <kbd className="hidden rounded border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] sm:block">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              No results for &quot;{query}&quot;
            </p>
          )}

          {grouped.map(({ group, items }) => (
            <div key={group}>
              <p className="px-4 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--muted-foreground-2)]">
                {group}
              </p>
              {items.map(({ label, href, index }) => (
                <button
                  key={href}
                  data-index={index}
                  onClick={() => navigate({ label, href, group })}
                  onMouseEnter={() => setCursor(index)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                    cursor === index
                      ? "bg-[rgba(200,74,31,0.08)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      cursor === index ? "bg-[var(--accent)]" : "bg-[var(--muted-foreground-2)]"
                    }`}
                  />
                  <span className="text-sm">{label}</span>
                  <span className="ml-auto font-mono text-[10px] text-[var(--muted-foreground-2)]">
                    {href.replace("/dashboard/", "").replace("/dashboard", "home")}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-[var(--line)] px-4 py-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
            ↑↓ navigate
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
            ↵ open
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
            ESC close
          </span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
            {results.length} results
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Public hook + trigger ────────────────────────────────────────────────────

/**
 * Drop into DashboardShell. Registers ⌘K / Ctrl+K globally.
 * Pass the user's effective tier so locked features are excluded.
 */
export function useCommandLauncher(tier: UserTier = "free") {
  const [open, setOpen] = useState(false);

  const triggerOpen = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const modal = open ? <LauncherModal onClose={close} tier={tier} /> : null;

  return { modal, triggerOpen };
}
