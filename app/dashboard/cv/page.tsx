import { createClient } from "@/lib/supabase/server";
import { CvPageContent } from "@/components/nextrole/cv-page";

export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("base_cv")
    .eq("id", user.id)
    .single();

  return (
    <CvPageContent
      initialCv={profile?.base_cv ?? null}
      error={error}
      message={message}
    />
  );
}
