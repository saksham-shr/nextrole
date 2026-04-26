import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResumeDetailPageContent } from "@/components/nextrole/resumes-page";
import type { ResumeWithJob } from "@/components/nextrole/resumes-page";

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("resumes")
    .select("*, jobs:job_id (title, company)")
    .eq("id", id)
    .single();

  if (!row) notFound();

  return <ResumeDetailPageContent resume={row as ResumeWithJob} />;
}
