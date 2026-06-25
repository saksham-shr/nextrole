"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/db/types";

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
