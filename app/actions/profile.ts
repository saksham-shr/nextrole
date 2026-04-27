"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseArr(raw: string | null): string[] | null {
  if (!raw?.trim()) return null;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseNum(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const get = (key: string) => (formData.get(key) as string | null)?.trim() || null;
  const getNum = (key: string, def: number | null = null) => {
    const raw = get(key);
    if (!raw) return def;
    const n = parseFloat(raw);
    return isNaN(n) ? def : n;
  };

  const full_name           = get("full_name");
  const base_cv             = get("base_cv");
  const work_mode_raw       = get("work_mode");
  const seniority_raw       = get("seniority");

  const years_experience    = parseNum(get("years_experience"));
  const comp_min            = parseNum(get("comp_min"));
  const comp_max            = parseNum(get("comp_max"));
  const current_comp        = parseNum(get("current_comp"));
  const preferred_language  = get("preferred_language") ?? "en";
  const eval_score_apply    = getNum("eval_score_apply", 3.5);
  const eval_score_watch    = getNum("eval_score_watch", 2.5);
  const custom_eval_focus   = get("custom_eval_focus");
  const custom_archetypes   = parseArr(get("custom_archetypes"));

  const target_roles            = parseArr(get("target_roles"));
  const target_locations        = parseArr(get("target_locations"));
  const target_archetypes       = parseArr(get("target_archetypes"));
  const preferred_company_types = parseArr(get("preferred_company_types"));
  const languages               = parseArr(get("languages"));

  // Validate enums
  const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
  type WorkMode = (typeof WORK_MODES)[number];
  const work_mode = WORK_MODES.includes(work_mode_raw as WorkMode)
    ? (work_mode_raw as WorkMode)
    : null;

  const SENIORITIES = ["junior", "mid", "senior", "staff", "principal"] as const;
  type Seniority = (typeof SENIORITIES)[number];
  const seniority = SENIORITIES.includes(seniority_raw as Seniority)
    ? (seniority_raw as Seniority)
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      years_experience,
      comp_min,
      comp_max,
      current_comp,
      target_roles,
      target_locations,
      base_cv,
      target_archetypes,
      preferred_company_types,
      work_mode,
      seniority,
      languages,
      preferred_language,
      eval_score_apply,
      eval_score_watch,
      custom_eval_focus,
      custom_archetypes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?message=Profile+saved");
}

// ── Focused CV save (used by /dashboard/cv) ──────────────────────────────────
export async function saveCV(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const base_cv = (formData.get("base_cv") as string)?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({ base_cv, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    redirect(`/dashboard/cv?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/cv");
  revalidatePath("/dashboard");
  redirect("/dashboard/cv?message=CV+saved");
}

// ── Partial profile save — no redirect, used by onboarding wizard ─────────────
const WORK_MODES_WIZ = ["remote", "hybrid", "onsite"] as const;
type WorkModeWiz = (typeof WORK_MODES_WIZ)[number];
const SENIORITIES_WIZ = ["junior", "mid", "senior", "staff", "principal"] as const;
type SeniorityWiz = (typeof SENIORITIES_WIZ)[number];

export async function saveProfileStep(fields: {
  full_name?: string | null;
  years_experience?: number | null;
  seniority?: string | null;
  work_mode?: string | null;
  base_cv?: string | null;
  comp_min?: number | null;
  comp_max?: number | null;
  current_comp?: number | null;
  target_roles?: string[] | null;
  target_locations?: string[] | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Validate enums before passing to Supabase
  const work_mode = WORK_MODES_WIZ.includes(fields.work_mode as WorkModeWiz)
    ? (fields.work_mode as WorkModeWiz)
    : null;
  const seniority = SENIORITIES_WIZ.includes(fields.seniority as SeniorityWiz)
    ? (fields.seniority as SeniorityWiz)
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      work_mode,
      seniority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { ok: true };
}
