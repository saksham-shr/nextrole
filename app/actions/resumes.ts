"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
