/**
 * Centralized AI routing layer.
 *
 * Primary model: google/gemini-2.0-flash-001 (via OpenRouter) for ALL tasks.
 *
 * On 429 / 503 rate-limit, callOpenRouter automatically walks through
 * OR_FREE_FALLBACKS in order until one responds successfully.
 *
 * Direct provider keys (Gemini, Anthropic, OpenAI) are used only if
 * OPENROUTER_API_KEY is not set.
 */

import { type Provider, callProvider, parseJSON } from "@/lib/ai/providers";
import { CREDIT_COSTS, type CreditTask } from "@/lib/ai/gates";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TASK_TO_ACTIVITY: Record<CreditTask, "evaluate" | "tailor_resume" | "autofill"> = {
  evaluate:        "evaluate",
  resume_standard: "tailor_resume",
  resume_premium:  "tailor_resume",
  autofill:        "autofill",
  tailor:          "tailor_resume",
};

// â”€â”€ Primary model â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Gemini Flash Lite â€” cheapest stable paid model ($0.075/1M tokens).
// Avoids :free experimental models that OpenRouter removes without notice.

const OR_PRIMARY_MODEL = "google/gemini-2.5-flash-lite";

// â”€â”€ Fallback chain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tried in order on 429 / 503. Stable free community models first, paid last.
// Only use :free models here since they can disappear â€” primary is always paid.

export const OR_FREE_FALLBACKS = [
  "deepseek/deepseek-chat-v3-0324:free",     // DeepSeek V3 â€” free, very capable
  "meta-llama/llama-3.3-70b-instruct:free",  // Llama 3.3 70B â€” free, stable
  "mistralai/mistral-7b-instruct:free",      // Mistral 7B â€” free, last resort
];

// â”€â”€ Direct provider fallback models (used when OPENROUTER_API_KEY is absent) â”€â”€

const DIRECT_GEMINI_MODEL    = "gemini-2.5-flash-lite";
const DIRECT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const DIRECT_OPENAI_MODEL    = "gpt-4o-mini";

// Two-pass eval lite (same model, exported so evaluate/route.ts can reference it)
export const EVAL_LITE_MODEL    = OR_PRIMARY_MODEL;
export const EVAL_LITE_PROVIDER: Provider = "openrouter";

// â”€â”€ Route result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AIRoute {
  provider: Provider;
  apiKey: string;
  model: string;
  fallbackModels?: string[];
}

// â”€â”€ Provider availability check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getKey(envVar: string): string | null {
  const v = process.env[envVar];
  return v && v.trim() ? v.trim() : null;
}

/**
 * Resolve route for any task â€” Gemini Flash via OpenRouter with free fallbacks.
 * Falls back to direct Gemini â†’ Anthropic â†’ OpenAI if no OpenRouter key is set.
 */
export function resolveRoute(_task: CreditTask): AIRoute {
  const orKey        = getKey("OPENROUTER_API_KEY");
  const geminiKey    = getKey("GEMINI_API_KEY");
  const anthropicKey = getKey("ANTHROPIC_API_KEY");
  const openaiKey    = getKey("OPENAI_API_KEY");

  if (orKey) {
    return {
      provider:       "openrouter",
      apiKey:         orKey,
      model:          OR_PRIMARY_MODEL,
      fallbackModels: OR_FREE_FALLBACKS,
    };
  }
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey, model: DIRECT_GEMINI_MODEL };
  }
  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, model: DIRECT_ANTHROPIC_MODEL };
  }
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, model: DIRECT_OPENAI_MODEL };
  }
  throw new Error("NO_AI_PROVIDER_CONFIGURED");
}

// â”€â”€ Credit deduction + AI call â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CallAIOptions {
  userId: string;
  task: CreditTask;
  system: string;
  user: string;
  maxTokens?: number;
  /** Override the auto-selected route (e.g. for two-pass eval lite pass) */
  routeOverride?: AIRoute;
}

/**
 * Deduct credits, call the AI, log usage. Throws on insufficient credits.
 * Free-tier daily limits are NOT checked here â€” those are enforced at the
 * API route level before calling this function.
 */
export async function callAI(opts: CallAIOptions): Promise<string> {
  const supabase = await createClient();
  const credits  = CREDIT_COSTS[opts.task];

  const route = opts.routeOverride ?? resolveRoute(opts.task);

  // Deduct credits atomically
  const { data: ok, error } = await supabase.rpc("deduct_credit", {
    p_user_id: opts.userId,
    p_amount:  credits,
  });
  if (error || ok !== true) throw new Error("INSUFFICIENT_CREDITS");

  const result = await callProvider({
    provider:       route.provider,
    apiKey:         route.apiKey,
    model:          route.model,
    system:         opts.system,
    user:           opts.user,
    maxTokens:      opts.maxTokens ?? 2048,
    cache:          route.provider === "anthropic",
    json:           true,
    fallbackModels: route.fallbackModels,
  });

  {
    const adminLog = createAdminClient();
    await adminLog.from("usage_log").insert({
      user_id:       opts.userId,
      activity_type: TASK_TO_ACTIVITY[opts.task],
      credits_used:  credits,
    });
  }

  return result;
}

export { parseJSON };
