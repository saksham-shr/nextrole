import { createClient } from "@/lib/supabase/server";
import { ScannerPageContent } from "@/components/nextrole/scanner-page";
import type { SourceWithLatestRun } from "@/components/nextrole/scanner-page";
import type { UserTier } from "@/lib/db/types";

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("scan_sources")
      .select(
        `*,
        scan_runs (
          id, status, discovered_count, added_count, duplicate_count, created_at
        )`,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("tier, target_roles, target_locations")
      .single(),
  ]);

  return (
    <ScannerPageContent
      sources={(rows ?? []) as SourceWithLatestRun[]}
      tier={(profile?.tier as UserTier) ?? "free"}
      targetRoles={(profile?.target_roles as string[] | null) ?? []}
      targetLocations={(profile?.target_locations as string[] | null) ?? []}
      error={error}
      message={message}
    />
  );
}
