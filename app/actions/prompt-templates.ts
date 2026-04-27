"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPromptTemplate(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  const template = (formData.get("template") as string)?.trim();
  const workflow = (formData.get("workflow") as string)?.trim() || "evaluate";
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name || !template) return { error: "Name and template are required" };

  const { error } = await supabase.from("prompt_templates").insert({
    user_id: user.id,
    name,
    description,
    workflow,
    template,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/prompts");
  return {};
}

export async function updatePromptTemplate(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const template = (formData.get("template") as string)?.trim();
  const workflow = (formData.get("workflow") as string)?.trim() || "evaluate";
  const description = (formData.get("description") as string)?.trim() || null;

  if (!id || !name || !template) return { error: "id, name and template are required" };

  const { error } = await supabase
    .from("prompt_templates")
    .update({ name, description, workflow, template, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/prompts");
  return {};
}

export async function deletePromptTemplate(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  if (!id) return { error: "id required" };

  const { error } = await supabase
    .from("prompt_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/prompts");
  return {};
}
