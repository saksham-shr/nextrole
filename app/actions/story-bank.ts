"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createStoryEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const situation = (formData.get("situation") as string | null)?.trim() ?? "";
  const task = (formData.get("task") as string | null)?.trim() ?? "";
  const action = (formData.get("action") as string | null)?.trim() ?? "";
  const result = (formData.get("result") as string | null)?.trim() ?? "";
  const reflection = (formData.get("reflection") as string | null)?.trim() ?? "";
  const tagsRaw = (formData.get("tags") as string | null)?.trim() ?? "";
  const difficultyRaw = (formData.get("difficulty") as string | null) ?? "medium";
  const difficulty = (
    ["easy", "medium", "hard"].includes(difficultyRaw) ? difficultyRaw : "medium"
  ) as "easy" | "medium" | "hard";
  const jobId = (formData.get("job_id") as string | null) || null;

  if (!title) redirect("/dashboard/story-bank?error=Title+is+required");

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const { error } = await supabase.from("story_bank_entries").insert({
    user_id: user.id,
    title,
    situation,
    task,
    action,
    result,
    reflection,
    tags,
    difficulty,
    job_id: jobId,
  });

  if (error) redirect(`/dashboard/story-bank?error=${encodeURIComponent(error.message)}`);

  redirect("/dashboard/story-bank?message=Story+saved");
}

export async function markStoryReady(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string | null;
  const status = formData.get("status") as "draft" | "ready" | null;
  if (!id || !status) return;

  await supabase
    .from("story_bank_entries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/story-bank");
}

export async function deleteStoryEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string | null;
  if (!id) redirect("/dashboard/story-bank?error=Missing+id");

  await supabase
    .from("story_bank_entries")
    .delete()
    .eq("id", id!)
    .eq("user_id", user.id);

  redirect("/dashboard/story-bank?message=Story+removed");
}
