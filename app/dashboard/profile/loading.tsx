export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-md bg-[var(--surface-soft)]" />
      <div className="flex gap-8">
        <div className="hidden h-[400px] w-[220px] shrink-0 animate-pulse rounded-xl bg-[var(--surface-soft)] lg:block" />
        <div className="flex flex-1 flex-col gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[220px] animate-pulse rounded-xl bg-[var(--surface-soft)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
