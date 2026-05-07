import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResumesPageContent } from "@/components/nextrole/resumes-page";
import type { ResumeWithJob } from "@/components/nextrole/resumes-page";
import type { JobRow, UserTier } from "@/lib/db/types";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export default async function ResumesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  const [{ data: resumeRows }, { data: jobRows }, { data: profile }] = await Promise.all([
    supabase
      .from("resumes")
      .select("*, jobs:job_id (title, company)")
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title, company, description")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single(),
  ]);

  const tier: UserTier = isAdmin ? "pro" : ((profile?.tier as UserTier) ?? "free");

  return (
    <ResumesPageContent
      resumes={(resumeRows ?? []) as ResumeWithJob[]}
      jobs={(jobRows ?? []) as Pick<JobRow, "id" | "title" | "company" | "description">[]}
      tier={tier}
    />
  );
}
