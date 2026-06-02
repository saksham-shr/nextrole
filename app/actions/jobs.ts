"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireJobSlot } from "@/lib/ai/guard";
import { NextResponse } from "next/server";
import type { JobStatus } from "@/lib/db/types";

export async function createJob(formData: FormData) {
  const slot = await requireJobSlot();
  if (slot instanceof NextResponse) {
    const body = await slot.json() as { error: string; limit?: number };
    if (body.error === "JOB_LIMIT_REACHED") {
      redirect(`/dashboard/pipeline?error=Job+limit+reached+(${body.limit}+jobs).+Upgrade+to+add+more.`);
    }
    redirect("/dashboard/pipeline?error=Access+denied");
  }

  const supabase = await createClient();
  const title = (formData.get("title") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();

  if (!title || !company) {
    redirect("/dashboard/pipeline?error=Title+and+company+are+required");
  }

  const { error } = await supabase.from("jobs").insert({
    user_id: slot.userId,
    title,
    company,
    url: (formData.get("url") as string)?.trim() || null,
    description: (formData.get("description") as string)?.trim() || null,
    source: (formData.get("source") as string)?.trim() || "manual",
    archetype: (formData.get("archetype") as string)?.trim() || null,
    status: "pending",
  });

  if (error) {
    redirect(`/dashboard/pipeline?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/pipeline");
  redirect("/dashboard/pipeline?message=Job+added+to+pipeline");
}

export async function updateJobStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const jobId = formData.get("job_id") as string;
  const status = formData.get("status") as JobStatus;

  const { error } = await supabase
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) return;

  await supabase.from("job_events").insert({
    user_id: user.id,
    job_id: jobId,
    event_type: "status_change",
    payload: { to: status },
  });

  revalidatePath("/dashboard/tracker");
  revalidatePath("/dashboard/pipeline");
}

export async function markFollowupSent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const jobId = formData.get("job_id") as string;

  // Reset updated_at — this is what the urgency clock runs from
  await supabase
    .from("jobs")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", user.id);

  await supabase.from("job_events").insert({
    user_id: user.id,
    job_id: jobId,
    event_type: "followup_sent",
    payload: { sent_at: new Date().toISOString() },
  });

  revalidatePath("/dashboard/followup");
}

export async function batchDeleteJobs(jobIds: string[]) {
  if (!jobIds.length) return { deleted: 0 };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("jobs")
    .delete()
    .in("id", jobIds)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/pipeline");
  return { deleted: jobIds.length };
}

export async function batchUpdateJobStatus(jobIds: string[], status: JobStatus) {
  if (!jobIds.length) return { updated: 0 };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", jobIds)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/pipeline");
  return { updated: jobIds.length };
}

export async function deleteJob(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = formData.get("job_id") as string;
  const returnTo =
    (formData.get("return_to") as string) || "/dashboard/pipeline";

  await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/tracker");
  revalidatePath("/dashboard/pipeline");
  redirect(returnTo);
}
