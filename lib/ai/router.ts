import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider } from "@/lib/evaluate/providers";

// Internal model IDs — never exposed to users
const MODEL_BASIC    = "claude-haiku-4-5-20251001";
const MODEL_ADVANCED = "claude-sonnet-4-6";

// Credits deducted per task type
export const TASK_CREDITS: Record<string, number> = {
  evaluate:       5,
  compare:        8,
  deep_research:  15,
  resume_tailor:  5,
  cover_letter:   5,
  interview_prep: 5,
  negotiate:      5,
  scan:           3,
  apply:          5,
  followup:       3,
  contact_draft:  3,
  training_eval:  5,
  project_eval:   5,
  pdf:            2,
  patterns:       5,
  batch:          10,
};

type Tier = "free" | "starter" | "pro" | "team" | "byok";

interface RouteResult {
  provider: string;
  apiKey: string;
  model: string;
  byok: boolean;
}

/**
 * Resolves which API key + model to use for a given user.
 * BYOK users get their own decrypted key and chosen model.
 * All other tiers use the platform key with tier-appropriate model.
 */
export async function resolveAIRoute(userId: string): Promise<RouteResult> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single();

  const tier = (profile?.tier ?? "free") as Tier;

  if (tier === "byok") {
    const { data: cred } = await supabase
      .from("provider_credentials")
      .select("provider, encrypted_key, model")
      .eq("user_id", userId)
      .eq("is_active", true)
      .neq("provider", "manual")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!cred?.encrypted_key) {
      throw new Error("BYOK_KEY_MISSING");
    }

    return {
      provider: cred.provider,
      apiKey:   decrypt(cred.encrypted_key),
      model:    cred.model ?? MODEL_ADVANCED,
      byok:     true,
    };
  }

  const platformKey = process.env.ANTHROPIC_API_KEY;
  if (!platformKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const advanced = tier === "pro" || tier === "team";

  return {
    provider: "anthropic",
    apiKey:   platformKey,
    model:    advanced ? MODEL_ADVANCED : MODEL_BASIC,
    byok:     false,
  };
}

/**
 * Check credits, make the AI call, deduct credits, log usage.
 * Throws "INSUFFICIENT_CREDITS" if the user is out.
 */
export async function callAI(
  userId: string,
  taskType: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  const supabase = await createClient();
  const credits  = TASK_CREDITS[taskType] ?? 1;

  // Resolve route first (throws if BYOK key missing)
  const route = await resolveAIRoute(userId);

  // Skip credit check for BYOK (unlimited)
  if (!route.byok) {
    // Team members deduct from the owner's credit pool
    let deductUserId = userId;
    const { data: membership } = await supabase
      .from("team_members")
      .select("owner_id")
      .eq("member_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (membership) deductUserId = membership.owner_id;

    const { data: ok } = await supabase.rpc("deduct_credit", {
      p_user_id: deductUserId,
      p_amount:  credits,
    });

    if (!ok) throw new Error("INSUFFICIENT_CREDITS");
  }

  const result = await callProvider(
    route.provider,
    route.apiKey,
    route.model,
    system,
    user,
    maxTokens,
  );

  // Fire-and-forget usage log
  supabase.from("usage_log").insert({
    user_id:      userId,
    task_type:    taskType,
    model:        route.model,
    credits_used: route.byok ? 0 : credits,
    byok:         route.byok,
  }).then(() => {});

  return result;
}
