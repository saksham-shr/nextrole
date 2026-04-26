import { createClient } from "@/lib/supabase/server";
import { BatchPageContent } from "@/components/nextrole/batch-page";
import type { JobRow } from "@/lib/db/types";

export default async function BatchPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return <BatchPageContent jobs={(rows ?? []) as JobRow[]} />;
}
