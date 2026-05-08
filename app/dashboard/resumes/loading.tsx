import { Skeleton } from "@/components/nextrole/ui";

function S({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function SidebarItem({ active }: { active?: boolean }) {
  return (
    <div
      className="mb-1 rounded-[6px] p-3"
      style={{
        background: active ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${active ? "rgba(200,74,31,0.2)" : "transparent"}`,
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <S className="h-5 w-5 rounded-[4px]" />
        <S className="h-3 w-24 rounded-[4px]" />
      </div>
      <S className="h-[10px] w-32 rounded-[4px]" />
      <div className="mt-1.5 flex justify-between">
        <S className="h-[9px] w-14 rounded-[4px]" />
        <S className="h-[9px] w-8 rounded-[4px]" />
      </div>
    </div>
  );
}

export default function ResumesLoading() {
  return (
    <div
      className="animate-pulse flex flex-col"
      style={{ height: "calc(100vh - 120px)", minHeight: 520 }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-end justify-between pb-5">
        <div className="space-y-2">
          <S className="h-[10px] w-16 rounded-[4px]" />
          <S className="h-7 w-48 rounded-[6px]" />
        </div>
        <S className="h-9 w-32 rounded-xl" />
      </div>

      {/* Split pane — stacks on mobile */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        {/* Sidebar */}
        <div className="shrink-0 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-2 md:w-[300px]">
          <SidebarItem active />
          <SidebarItem />
          <SidebarItem />
        </div>

        {/* Preview pane */}
        <div className="min-h-[300px] min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--surface)]">
          {/* Preview header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3">
            <S className="h-[26px] w-[26px] shrink-0 rounded-[5px]" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <S className="h-3 w-40 rounded-[4px]" />
              <S className="h-[10px] w-28 rounded-[4px]" />
            </div>
            <S className="h-7 w-24 shrink-0 rounded-lg" />
            <S className="hidden h-7 w-12 rounded-lg sm:block" />
          </div>

          {/* PDF-style preview placeholder — hidden on very small screens */}
          <div className="flex-1 bg-[var(--surface-soft)] p-4 overflow-hidden">
            <div className="mx-auto bg-white max-w-full overflow-hidden" style={{ padding: "32px 24px", boxShadow: "0 4px 16px rgba(42,38,32,0.07)" }}>
              <div style={{ borderBottom: "2px solid var(--line-soft)", paddingBottom: 12, marginBottom: 16 }}>
                <S className="h-6 w-48 rounded-[4px]" />
                <S className="mt-2 h-[10px] w-full rounded-[4px]" />
              </div>
              <S className="mb-3 h-[9px] w-20 rounded-[4px]" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div className="flex justify-between mb-1.5">
                    <S className="h-3 w-36 rounded-[4px]" />
                    <S className="h-3 w-16 rounded-[4px]" />
                  </div>
                  <S className="h-[9px] w-full rounded-[4px]" />
                  <S className="mt-1 h-[9px] w-5/6 rounded-[4px]" />
                </div>
              ))}
              <S className="mb-2 h-[9px] w-12 rounded-[4px]" />
              <S className="h-[9px] w-full rounded-[4px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
