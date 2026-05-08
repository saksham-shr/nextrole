import { Skeleton } from "@/components/nextrole/ui";

function S({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function FormCard({ fields = 2, tall = false }: { fields?: number; tall?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
        <S className="h-[15px] w-36 rounded-[4px]" />
        <S className="mt-1.5 h-[11px] w-56 rounded-[4px]" />
      </div>
      <div className={`grid gap-4 ${fields > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <S className="mb-1.5 h-[9px] w-24 rounded-[4px]" />
            <S className={`w-full rounded-lg ${tall && i === fields - 1 ? "h-32" : "h-[42px]"}`} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <S className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="animate-pulse mx-auto pt-4" style={{ maxWidth: 1100 }}>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr]">
        {/* Sidebar */}
        <div className="shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <S className="h-[9px] w-16 rounded-[4px]" />
            <S className="h-6 w-6 rounded-[5px]" />
          </div>
          <div className="flex flex-col gap-1">
            {["w-28", "w-32", "w-24", "w-36", "w-14"].map((w, i) => (
              <S key={i} className={`h-8 ${w} rounded-[5px]`} />
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <S className="h-8 w-32 rounded-[6px]" />
          </div>

          {/* Personal info */}
          <FormCard fields={4} />

          {/* CV */}
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
            <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
              <S className="h-[15px] w-20 rounded-[4px]" />
              <S className="mt-1.5 h-[11px] w-52 rounded-[4px]" />
            </div>
            <S className="h-[220px] w-full rounded-lg" />
            <div className="mt-3 flex justify-between">
              <S className="h-[10px] w-32 rounded-[4px]" />
              <S className="h-9 w-20 rounded-lg" />
            </div>
          </div>

          {/* Job preferences — tag inputs */}
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
            <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
              <S className="h-[15px] w-36 rounded-[4px]" />
              <S className="mt-1.5 h-[11px] w-52 rounded-[4px]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <S className="mb-1.5 h-[9px] w-28 rounded-[4px]" />
                  <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-[var(--line-soft)] px-2.5 py-1.5">
                    {i < 3 && <S className="h-5 w-16 rounded-[4px]" />}
                    {i === 0 && <S className="h-5 w-20 rounded-[4px]" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <S className="h-9 w-28 rounded-lg" />
            </div>
          </div>

          {/* Compensation slider */}
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
            <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
              <S className="h-[15px] w-32 rounded-[4px]" />
              <S className="mt-1.5 h-[11px] w-60 rounded-[4px]" />
            </div>
            <div className="space-y-6">
              <S className="h-5 w-32 rounded-[4px]" />
              <div>
                <div className="flex justify-between mb-2">
                  <S className="h-[10px] w-14 rounded-[4px]" />
                  <S className="h-[10px] w-16 rounded-[4px]" />
                </div>
                <S className="h-[5px] w-full rounded-full" />
              </div>
              <div>
                <S className="mb-3 h-[9px] w-36 rounded-[4px]" />
                <div className="flex items-center gap-4">
                  <div className="space-y-1 text-center">
                    <S className="h-[9px] w-8 rounded-[4px]" />
                    <S className="h-4 w-16 rounded-[4px]" />
                  </div>
                  <S className="h-[6px] flex-1 rounded-full" />
                  <div className="space-y-1 text-center">
                    <S className="h-[9px] w-8 rounded-[4px]" />
                    <S className="h-4 w-16 rounded-[4px]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <S className="h-9 w-16 rounded-lg" />
            </div>
          </div>

          {/* AI & Evaluation */}
          <FormCard fields={4} tall />
        </div>
      </div>
    </div>
  );
}
