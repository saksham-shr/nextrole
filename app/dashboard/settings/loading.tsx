import { Skeleton } from "@/components/nextrole/ui";

function S({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function SettingsSection({ fields = 2 }: { fields?: number }) {
  return (
    <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
        <S className="h-[15px] w-36 rounded-[4px]" />
        <S className="mt-1.5 h-[11px] w-56 rounded-[4px]" />
      </div>
      <div className={`grid gap-4 ${fields > 1 ? "sm:grid-cols-2" : ""}`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <S className="mb-1.5 h-[9px] w-24 rounded-[4px]" />
            <S className="h-[42px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div
      className="animate-pulse"
      style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "200px 1fr", gap: 32, paddingTop: 16 }}
    >
      {/* Sidebar nav */}
      <div className="shrink-0">
        <S className="mb-3 h-[9px] w-16 rounded-[4px]" />
        <div className="flex flex-col gap-1">
          {["w-28", "w-32", "w-24", "w-36"].map((w, i) => (
            <S key={i} className={`h-8 ${w} rounded-lg`} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-4">
        {/* Profile & CV section */}
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
          <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
            <S className="h-[15px] w-28 rounded-[4px]" />
            <S className="mt-1.5 h-[11px] w-64 rounded-[4px]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <S className="mb-1.5 h-[9px] w-24 rounded-[4px]" />
              <S className="h-[42px] w-full rounded-lg" />
            </div>
            <div>
              <S className="mb-1.5 h-[9px] w-28 rounded-[4px]" />
              <S className="h-[42px] w-full rounded-lg" />
            </div>
          </div>
          <div className="mt-4">
            <S className="mb-1.5 h-[9px] w-16 rounded-[4px]" />
            <S className="h-32 w-full rounded-lg" />
          </div>
        </div>

        {/* Job preferences — tag inputs */}
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
          <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
            <S className="h-[15px] w-36 rounded-[4px]" />
            <S className="mt-1.5 h-[11px] w-52 rounded-[4px]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <S className="mb-1.5 h-[9px] w-28 rounded-[4px]" />
                {/* Tag chip input */}
                <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-[var(--line-soft)] px-2.5 py-1.5">
                  {i < 3 && <S className="h-5 w-16 rounded-[4px]" />}
                  {i === 0 && <S className="h-5 w-20 rounded-[4px]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compensation slider */}
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
          <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
            <S className="h-[15px] w-32 rounded-[4px]" />
            <S className="mt-1.5 h-[11px] w-60 rounded-[4px]" />
          </div>
          <div className="space-y-6">
            {/* Locale badge */}
            <S className="h-5 w-32 rounded-[4px]" />
            {/* Current comp slider */}
            <div>
              <S className="mb-2 h-[9px] w-40 rounded-[4px]" />
              <div className="flex justify-between mb-2">
                <S className="h-[10px] w-14 rounded-[4px]" />
                <S className="h-[10px] w-16 rounded-[4px]" />
              </div>
              <S className="h-[5px] w-full rounded-full" />
            </div>
            {/* Target range dual slider */}
            <div>
              <S className="mb-3 h-[9px] w-36 rounded-[4px]" />
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <S className="mb-0.5 h-[9px] w-8 rounded-[4px]" />
                  <S className="h-4 w-16 rounded-[4px]" />
                </div>
                <S className="flex-1 h-[6px] rounded-full" />
                <div className="text-center">
                  <S className="mb-0.5 h-[9px] w-8 rounded-[4px]" />
                  <S className="h-4 w-16 rounded-[4px]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI & Evaluation section */}
        <SettingsSection fields={4} />

        {/* Save button */}
        <S className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}
