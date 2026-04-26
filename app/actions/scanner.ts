"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function detectType(url: string): string {
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("ashbyhq.com")) return "ashby";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("workable.com")) return "workable";
  if (url.includes("smartrecruiters.com")) return "smartrecruiters";
  if (url.includes("bamboohr.com")) return "bamboohr";
  if (url.includes("icims.com")) return "icims";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("indeed.com")) return "indeed";
  if (url.includes("wellfound.com") || url.includes("angel.co")) return "wellfound";
  if (url.includes("ycombinator.com")) return "yc";
  return "custom";
}

/** Add a portal from the curated library — called via client fetch, not form action */
export async function addPortalFromLibrary(portalId: string, name: string, url: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Check not already added
  const { data: existing } = await supabase
    .from("scan_sources").select("id").eq("user_id", user.id).eq("url", url).single();
  if (existing) return { error: "Already added" };

  const { error } = await supabase.from("scan_sources").insert({
    user_id: user.id,
    name,
    url,
    type: detectType(url),
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/scanner");
  return {};
}

export async function addScanSource(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const url = (formData.get("url") as string | null)?.trim() ?? "";

  if (!name || !url) {
    redirect("/dashboard/scanner?error=Name+and+URL+are+required");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    redirect("/dashboard/scanner?error=Invalid+URL");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    redirect("/dashboard/scanner?error=URL+must+start+with+https");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("scan_sources").insert({
    user_id: user.id,
    name,
    url,
    type: detectType(url),
  });

  if (error) redirect(`/dashboard/scanner?error=${encodeURIComponent(error.message)}`);

  redirect("/dashboard/scanner?message=Source+added");
}

export async function deleteScanSource(formData: FormData) {
  const sourceId = formData.get("source_id") as string | null;
  if (!sourceId) redirect("/dashboard/scanner?error=Missing+source+id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("scan_sources")
    .delete()
    .eq("id", sourceId!)
    .eq("user_id", user.id);

  if (error) redirect(`/dashboard/scanner?error=${encodeURIComponent(error.message)}`);

  redirect("/dashboard/scanner?message=Source+removed");
}
