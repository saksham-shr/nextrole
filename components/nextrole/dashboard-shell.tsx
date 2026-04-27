"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BrandWordmark } from "@/components/nextrole/brand";
import { Badge, Button, Surface } from "@/components/nextrole/ui";
import { navGroups, quickActions } from "@/lib/nextrole-data";
import { signOut } from "@/app/actions/auth";
import { useCommandLauncher } from "@/components/nextrole/command-launcher";

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nextrole-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("nextrole-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }

  return { dark, toggle };
}

function NavigationProgress() {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2.5px] origin-left animate-[nav-progress_0.7s_ease-out_forwards] bg-[var(--accent)]"
    />
  );
}

function displayName(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function DashboardShell({
  children,
  user,
  isAdmin = false,
}: {
  children: ReactNode;
  user: { email: string };
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { modal, triggerOpen } = useCommandLauncher();
  const { dark, toggle: toggleDark } = useDarkMode();

  const allNavGroups = useMemo(() => {
    if (!isAdmin) return navGroups;
    return [
      ...navGroups,
      {
        title: "Admin",
        items: [{ label: "Analytics", href: "/dashboard/admin" }],
      },
    ];
  }, [isAdmin]);

  return (
    <div className="min-h-screen p-3 sm:p-4">
      <NavigationProgress />
      {modal}

      <Surface className="min-h-[calc(100vh-1.5rem)] overflow-hidden">
        <div className="flex min-h-[calc(100vh-1.5rem)]">
          <aside className="hidden w-72 shrink-0 border-r border-[var(--line)] bg-[var(--surface)] lg:flex lg:flex-col">
            <div className="border-b border-[var(--line)] px-5 py-5">
              <BrandWordmark labelClassName="text-4xl" />
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                Job search operating system with evaluate, tracker, scanner,
                resumes, interview prep, and pattern loops in one place.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {allNavGroups.map((group) => (
                <div key={group.title} className="mb-5">
                  <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground-2)]">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-full px-3 py-2 text-sm transition ${
                            active
                              ? "bg-[rgba(200,74,31,0.1)] font-bold text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)]"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              active
                                ? "bg-[var(--accent)]"
                                : "bg-[var(--muted-foreground-2)]"
                            }`}
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--line)] px-5 py-4">
              <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <p className="text-sm font-bold">{displayName(user.email)}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {user.email}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="accent">14-day free trial</Badge>
                  {isAdmin ? <Badge tone="ok">Admin</Badge> : <Badge>Manual mode ready</Badge>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      Sign out
                    </button>
                  </form>
                  <button
                    onClick={toggleDark}
                    title={dark ? "Switch to light mode" : "Switch to dark mode"}
                    className="rounded-full border border-[var(--line-soft)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {dark ? "Light" : "Dark"}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[rgba(247,243,236,0.94)] backdrop-blur">
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={triggerOpen}
                    className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                  >
                    <span className="hidden sm:inline">⌘K · </span>Search pages, actions, tools...
                  </button>
                </div>
                <Badge>2 tasks running</Badge>
                <Badge tone="warn">6 attention items</Badge>
                <div className="hidden gap-2 xl:flex">
                  {quickActions.slice(0, 3).map((action, index) => (
                    <Button
                      key={action.href}
                      href={action.href}
                      tone={index === 0 ? "accent" : "default"}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </header>

            <div className="border-b border-[var(--line)] px-4 py-3 lg:hidden">
              <div className="flex gap-2 overflow-x-auto">
                {allNavGroups.flatMap((group) => group.items).map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--surface)]"
                          : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {children}
            </main>
          </div>
        </div>
      </Surface>
    </div>
  );
}
