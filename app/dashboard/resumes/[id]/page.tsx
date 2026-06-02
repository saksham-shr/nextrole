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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase.from("resumes").select("*, jobs:job_id (title, company)").eq("id", id).eq("user_id", user!.id).single(),
    supabase.from("profiles").select("base_cv").eq("id", user!.id).single(),
  ]);

  if (!row) notFound();

  return <ResumeDetailPageContent resume={row as ResumeWithJob} baseCv={profile?.base_cv ?? null} />;
}
