import { Skeleton } from "@/components/nextrole/ui";

function S({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function FormSection({ label, subtitle, cols = 2, fields = 2 }: { label: string; subtitle?: string; cols?: number; fields?: number }) {
  void label; void subtitle;
  return (
    <div className="rounded-[14px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
      <div className="mb-4">
        <S className="h-4 w-32 rounded-[4px]" />
        <S className="mt-1.5 h-[10px] w-56 rounded-[4px]" />
      </div>
      <div className={`grid gap-4 ${cols > 1 ? "sm:grid-cols-2" : ""}`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <S className="mb-2 h-[9px] w-24 rounded-[4px]" />
            <S className="h-[46px] w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="animate-pulse space-y-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <S className="h-[10px] w-36 rounded-[4px]" />
        <S className="mt-2 h-10 w-40 rounded-[6px]" />
        <S className="mt-3 h-[10px] w-full max-w-lg rounded-[4px]" />
        <S className="mt-1.5 h-[10px] w-4/5 max-w-lg rounded-[4px]" />
      </div>

      {/* Completion card */}
      <div className="rounded-[14px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <S className="h-4 w-48 rounded-[4px]" />
            <S className="h-[10px] w-64 rounded-[4px]" />
          </div>
          <S className="h-14 w-14 rounded-full" />
        </div>
        {/* Summary stat grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[16px] border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3">
              <S className="mb-1 h-[9px] w-16 rounded-[4px]" />
              <S className="h-3.5 w-32 rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>

      {/* Identity section */}
      <FormSection label="Identity" cols={2} fields={4} />

      {/* Job targeting */}
      <div className="rounded-[14px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="mb-4">
          <S className="h-4 w-32 rounded-[4px]" />
          <S className="mt-1.5 h-[10px] w-64 rounded-[4px]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <S className="mb-2 h-[9px] w-36 rounded-[4px]" />
              <S className="h-[46px] w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Compensation section */}
      <div className="rounded-[14px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="mb-4">
          <S className="h-4 w-28 rounded-[4px]" />
          <S className="mt-1.5 h-[10px] w-56 rounded-[4px]" />
        </div>
        <S className="mb-4 h-5 w-32 rounded-[4px]" />
        <div className="space-y-6">
          <div>
            <S className="mb-2 h-[9px] w-40 rounded-[4px]" />
            <div className="flex justify-between mb-2">
              <S className="h-[10px] w-14 rounded-[4px]" />
              <S className="h-[10px] w-16 rounded-[4px]" />
            </div>
            <S className="h-[5px] w-full rounded-full" />
          </div>
          <div>
            <S className="mb-3 h-[9px] w-32 rounded-[4px]" />
            <div className="flex items-center gap-4">
              <div>
                <S className="mb-0.5 h-[9px] w-8 rounded-[4px]" />
                <S className="h-4 w-16 rounded-[4px]" />
              </div>
              <S className="flex-1 h-[6px] rounded-full" />
              <div>
                <S className="mb-0.5 h-[9px] w-8 rounded-[4px]" />
                <S className="h-4 w-16 rounded-[4px]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation behaviour */}
      <FormSection label="Evaluation behaviour" cols={2} fields={2} />

      {/* Save button */}
      <div className="flex gap-3">
        <S className="h-10 w-28 rounded-full" />
        <S className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}
