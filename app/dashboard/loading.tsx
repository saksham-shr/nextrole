import { Skeleton, SkeletonText } from "@/components/nextrole/ui";

function SkeletonStatCard() {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[2px_3px_0_rgba(26,24,20,0.08)]">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-2 w-20" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-10 w-64 sm:w-80" />
          <SkeletonText lines={2} className="max-w-xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Filter / pill row */}
      <div className="flex gap-2">
        {["w-20", "w-24", "w-18", "w-28", "w-22"].map((w) => (
          <Skeleton key={w} className={`h-7 ${w} rounded-full`} />
        ))}
      </div>

      {/* Main content panel */}
      <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[2px_3px_0_rgba(26,24,20,0.08)]">
        {/* Tab bar */}
        <div className="flex gap-4 border-b border-[var(--line)] px-5 py-4">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>

        {/* Table rows */}
        <div className="divide-y divide-dashed divide-[var(--line-soft)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
