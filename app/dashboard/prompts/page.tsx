import { createClient } from "@/lib/supabase/server";
import { PromptsPageContent } from "@/components/nextrole/prompts-page";
import type { PromptTemplateRow } from "@/lib/db/types";

export default async function PromptsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prompt_templates")
    .select("*")
    .order("created_at", { ascending: false });

  return <PromptsPageContent templates={(data ?? []) as PromptTemplateRow[]} />;
}
