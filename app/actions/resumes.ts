"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { renderResumeHtml } from "@/lib/resume/template";
import type { ResumeData } from "@/lib/resume/template";

export async function batchDeleteResumes(resumeIds: string[]) {
  if (!resumeIds.length) return { deleted: 0 };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("resumes")
    .delete()
    .in("id", resumeIds)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/resumes");
  return { deleted: resumeIds.length };
}

export async function updateResume(
  resumeId: string,
  data: ResumeData,
): Promise<{ content: string; html: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!Array.isArray(data.experience)) data.experience = [];

  const content = JSON.stringify(data);
  const html = renderResumeHtml(data);

  const { error } = await supabase
    .from("resumes")
    .update({ content, html })
    .eq("id", resumeId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/resumes");
  return { content, html };
}
