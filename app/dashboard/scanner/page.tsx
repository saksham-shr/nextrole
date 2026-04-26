import { createClient } from "@/lib/supabase/server";
import { ScannerPageContent } from "@/components/nextrole/scanner-page";
import type { SourceWithLatestRun } from "@/components/nextrole/scanner-page";

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("scan_sources")
    .select(
      `*,
      scan_runs (
        id, status, discovered_count, added_count, duplicate_count, created_at
      )`,
    )
    .order("created_at", { ascending: false });

  return (
    <ScannerPageContent
      sources={(rows ?? []) as SourceWithLatestRun[]}
      error={error}
      message={message}
    />
  );
}
