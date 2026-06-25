"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireJobSlot } from "@/lib/ai/guard";
import { NextResponse } from "next/server";

export async function addJobFromExplore(job: {
  title: string;
  company: string;
  url: string | null;
  description: string;
  archetype: string | null;
}): Promise<{ ok: true; jobId: string } | { error: string }> {
  const slot = await requireJobSlot();
  if (slot instanceof NextResponse) {
    const body = await slot.json() as { error: string; limit?: number };
    if (body.error === "JOB_LIMIT_REACHED") {
      return { error: "Job limit reached — upgrade to add more" };
    }
    return { error: "Access denied" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", slot.userId)
    .ilike("title", job.title)
    .ilike("company", job.company)
    .limit(1)
    .maybeSingle();

  if (existing) return { error: "Already in your pipeline" };

  const { data: created, error } = await supabase
    .from("jobs")
    .insert({
      user_id: slot.userId,
      title: job.title,
      company: job.company,
      url: job.url,
      description: job.description,
      archetype: job.archetype,
      source: "explore",
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not add job" };

  revalidatePath("/dashboard/pipeline");
  return { ok: true, jobId: created.id };
}
