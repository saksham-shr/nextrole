import { Skeleton } from "@/components/nextrole/ui";

function S({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function UsageCell() {
  return (
    <div className="rounded-xl border border-[var(--line-soft)] p-4">
      <S className="h-[9px] w-24 rounded-[4px]" />
      <S className="mt-2 h-6 w-12 rounded-[4px]" />
      <S className="mt-1.5 h-[9px] w-20 rounded-[4px]" />
    </div>
  );
}

function PlanCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-start justify-between">
        <S className="h-[9px] w-16 rounded-[4px]" />
        <S className="h-4 w-20 rounded-full" />
      </div>
      <S className="mb-1 h-8 w-24 rounded-[4px]" />
      <S className="mb-5 h-[9px] w-20 rounded-[4px]" />
      <div className="flex-1 space-y-2.5 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <S className="h-3 w-3 rounded-full shrink-0" />
            <S className="h-3 w-36 rounded-[4px]" />
          </div>
        ))}
      </div>
      <S className="h-9 w-full rounded-xl" />
    </div>
  );
}

export default function BillingLoading() {
  return (
    <div className="animate-pulse mx-auto max-w-[860px] px-6 py-8">
      {/* Header */}
      <S className="mb-2 h-[9px] w-10 rounded-[4px]" />
      <S className="mb-8 h-7 w-40 rounded-[6px]" />

      {/* Current plan card */}
      <div className="mb-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <S className="h-[9px] w-24 rounded-[4px]" />
            <div className="flex items-center gap-3">
              <S className="h-6 w-16 rounded-md" />
              <S className="h-[10px] w-32 rounded-[4px]" />
            </div>
          </div>
          <S className="h-8 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[var(--line-soft)] p-4">
            <S className="h-[9px] w-20 rounded-[4px]" />
            <S className="mt-2 h-7 w-24 rounded-[4px]" />
            <S className="mt-2 h-1.5 w-full rounded-full" />
            <S className="mt-1.5 h-[9px] w-36 rounded-[4px]" />
          </div>
          <UsageCell />
          <UsageCell />
        </div>
      </div>

      {/* Top-up packs */}
      <div className="mb-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <S className="h-4 w-36 rounded-[4px]" />
          <S className="h-[9px] w-32 rounded-[4px]" />
        </div>
        <S className="mb-4 h-[10px] w-full rounded-[4px]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--line-soft)] p-4">
              <S className="h-6 w-12 rounded-[4px]" />
              <S className="mt-0.5 h-[9px] w-14 rounded-[4px]" />
              <S className="mt-3 h-4 w-16 rounded-[4px]" />
              <S className="mt-2 h-7 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Switch plan section */}
      <div className="mb-3 flex items-center justify-between">
        <S className="h-4 w-24 rounded-[4px]" />
        <S className="h-7 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PlanCardSkeleton />
        <PlanCardSkeleton />
        <PlanCardSkeleton />
      </div>

      {/* Credit log */}
      <div className="mt-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <S className="h-4 w-32 rounded-[4px]" />
          <S className="h-[9px] w-40 rounded-[4px]" />
        </div>
        <div className="rounded-xl border border-[var(--line-soft)] overflow-hidden">
          <div className="border-b border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-2.5 grid grid-cols-3 gap-4">
            <S className="h-[9px] w-16 rounded-[4px]" />
            <S className="h-[9px] w-12 rounded-[4px] ml-auto" />
            <S className="h-[9px] w-12 rounded-[4px] ml-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 px-4 py-3 border-t border-[var(--line-soft)]">
              <S className="h-3 w-28 rounded-[4px]" />
              <S className="h-3 w-8 rounded-[4px] ml-auto" />
              <S className="h-3 w-16 rounded-[4px] ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
