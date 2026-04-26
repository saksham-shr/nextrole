import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportDetailPageContent } from "@/components/nextrole/reports-page";
import type { ReportWithJob } from "@/components/nextrole/reports-page";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("reports")
    .select("*, jobs:job_id (title, company)")
    .eq("id", id)
    .single();

  if (!row) notFound();

  return <ReportDetailPageContent report={row as ReportWithJob} />;
}
