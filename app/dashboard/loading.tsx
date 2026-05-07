import { Skeleton } from "@/components/nextrole/ui";

function S({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function StatCard() {
  return (
    <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] p-4">
      <S className="h-[10px] w-24 rounded-[4px]" />
      <S className="mt-3 h-7 w-12 rounded-[4px]" />
      <S className="mt-2 h-[9px] w-16 rounded-[4px]" />
    </div>
  );
}

function AttentionRow() {
  return (
    <div className="flex items-start gap-3 rounded-[6px] border border-[var(--line-soft)] p-3">
      <S className="mt-0.5 h-4 w-4 shrink-0 rounded-[4px]" />
      <div className="flex-1 space-y-1.5">
        <S className="h-3 w-48 rounded-[4px]" />
        <S className="h-[10px] w-72 rounded-[4px]" />
      </div>
    </div>
  );
}

function QuickActionCard() {
  return (
    <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
      <S className="mb-3 h-8 w-8 rounded-[8px]" />
      <S className="h-3.5 w-32 rounded-[4px]" />
      <S className="mt-2 h-[10px] w-full rounded-[4px]" />
      <S className="mt-1 h-[10px] w-3/4 rounded-[4px]" />
      <S className="mt-4 h-[10px] w-24 rounded-[4px]" />
    </div>
  );
}

function ActivityRow() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-t border-[var(--line-soft)]"
      style={{ display: "grid", gridTemplateColumns: "32px 1fr 100px 100px 24px", gap: 12 }}
    >
      <S className="h-7 w-7 rounded-[6px]" />
      <div className="space-y-1.5">
        <S className="h-3 w-40 rounded-[4px]" />
        <S className="h-[10px] w-24 rounded-[4px]" />
      </div>
      <S className="h-[10px] w-20 rounded-[4px]" />
      <S className="h-5 w-16 rounded-full" />
      <S className="h-4 w-4 rounded-[4px]" />
    </div>
  );
}

function RightRail() {
  return (
    <div className="hidden lg:flex flex-col gap-3">
      {/* Plan badge */}
      <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between">
          <S className="h-5 w-16 rounded-full" />
          <S className="h-[10px] w-20 rounded-[4px]" />
        </div>
      </div>
      {/* Credits widget */}
      <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] p-[18px]">
        <S className="h-[10px] w-28 rounded-[4px]" />
        <S className="mt-2 h-7 w-20 rounded-[4px]" />
        <S className="mt-3 h-[6px] w-full rounded-full" />
        <S className="mt-2 h-[10px] w-36 rounded-[4px]" />
        <div className="mt-4 h-px bg-[var(--line-soft)]" />
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <S className="h-3 w-24 rounded-[4px]" />
            <S className="h-3 w-14 rounded-[4px]" />
          </div>
          <div className="flex items-center justify-between">
            <S className="h-3 w-28 rounded-[4px]" />
            <S className="h-3 w-14 rounded-[4px]" />
          </div>
          <div className="flex items-center justify-between">
            <S className="h-3 w-20 rounded-[4px]" />
            <S className="h-3 w-10 rounded-[4px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div
      className="animate-pulse"
      style={{
        maxWidth: 1280,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 24,
        alignItems: "start",
      }}
    >
      {/* Main column */}
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <S className="h-[10px] w-28 rounded-[4px]" />
            <S className="h-9 w-64 rounded-[6px]" />
          </div>
          <S className="h-8 w-24 rounded-full" />
        </div>

        {/* 4 KPI stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard />
          <StatCard />
          <StatCard />
          <StatCard />
        </div>

        {/* Attention items */}
        <div className="space-y-2">
          <AttentionRow />
          <AttentionRow />
        </div>

        {/* Quick actions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <S className="h-[10px] w-24 rounded-[4px]" />
            <div className="flex-1 h-px bg-[var(--line-soft)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickActionCard />
            <QuickActionCard />
            <QuickActionCard />
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <S className="h-[10px] w-32 rounded-[4px]" />
              <div className="h-px w-20 bg-[var(--line-soft)]" />
            </div>
            <S className="h-[10px] w-16 rounded-[4px]" />
          </div>
          <div className="rounded-[8px] border border-[var(--line-soft)] overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <ActivityRow key={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Right rail */}
      <RightRail />
    </div>
  );
}
