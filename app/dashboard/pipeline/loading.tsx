import { Skeleton } from "@/components/nextrole/ui";

function S({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function MobileJobCard({ i }: { i: number }) {
  return (
    <div
      className="flex items-start gap-3 p-4 md:hidden"
      style={{ borderTop: i === 0 ? "none" : "1px solid var(--line-soft)" }}
    >
      <S className="h-8 w-8 shrink-0 rounded-[6px]" />
      <div className="flex-1 space-y-1.5">
        <S className="h-3.5 w-40 rounded-[4px]" />
        <S className="h-[10px] w-24 rounded-[4px]" />
        <div className="flex gap-2 pt-1">
          <S className="h-6 w-20 rounded-[4px]" />
          <S className="h-6 w-16 rounded-[4px]" />
        </div>
      </div>
    </div>
  );
}

function DesktopJobRow({ i }: { i: number }) {
  return (
    <div
      className="hidden md:grid items-center px-[18px] py-[14px]"
      style={{
        gridTemplateColumns: "36px 1fr 110px 110px 110px 1fr",
        gap: 12,
        borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <S className="h-8 w-8 rounded-[6px]" />
      <div className="space-y-1.5">
        <S className="h-3.5 w-40 rounded-[4px]" />
        <S className="h-[10px] w-24 rounded-[4px]" />
      </div>
      <S className="h-[10px] w-20 rounded-[4px]" />
      <S className="h-6 w-14 rounded-full" />
      <S className="h-7 w-24 rounded-[6px]" />
      <div className="flex items-center justify-end gap-2">
        <S className="h-7 w-7 rounded-[6px]" />
        <S className="h-7 w-16 rounded-[6px]" />
      </div>
    </div>
  );
}

export default function PipelineLoading() {
  return (
    <div className="animate-pulse space-y-5" style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <S className="h-[10px] w-20 rounded-[4px]" />
          <S className="h-8 w-48 rounded-[6px]" />
        </div>
        <S className="h-9 w-28 rounded-xl" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] p-2">
        <div className="flex gap-1.5">
          {["w-20", "w-24", "w-[72px]", "w-[88px]", "w-20"].map((w, i) => (
            <S key={i} className={`h-7 ${w} shrink-0 rounded-full`} />
          ))}
        </div>
        <div className="ml-auto shrink-0">
          <S className="h-7 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[8px] border border-[var(--line-soft)] overflow-hidden">
        {/* Desktop header */}
        <div
          className="hidden md:grid items-center px-[18px] py-[10px]"
          style={{
            gridTemplateColumns: "36px 1fr 110px 110px 110px 1fr",
            gap: 12,
            background: "var(--background)",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <div />
          <S className="h-[9px] w-16 rounded-[4px]" />
          <S className="h-[9px] w-14 rounded-[4px]" />
          <S className="h-[9px] w-10 rounded-[4px]" />
          <S className="h-[9px] w-14 rounded-[4px]" />
          <div />
        </div>

        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i}>
            <MobileJobCard i={i} />
            <DesktopJobRow i={i} />
          </div>
        ))}
      </div>
    </div>
  );
}
