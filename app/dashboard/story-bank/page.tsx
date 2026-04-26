import { createClient } from "@/lib/supabase/server";
import { StoryBankPageContent } from "@/components/nextrole/story-bank-page";
import type { StoryWithJob } from "@/components/nextrole/story-bank-page";

export default async function StoryBankPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const [{ data: stories }, { data: jobs }] = await Promise.all([
    supabase
      .from("story_bank_entries")
      .select(`*, jobs (title, company)`)
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title, company")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <StoryBankPageContent
      stories={(stories ?? []) as StoryWithJob[]}
      jobs={jobs ?? []}
      error={error}
      message={message}
    />
  );
}
