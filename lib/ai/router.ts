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

// ── Primary model ──────────────────────────────────────────────────────────────
// Used for every task type — fast, cheap, and capable enough for all features.

const OR_PRIMARY_MODEL = "google/gemini-2.0-flash-001";

// ── Free fallback chain ────────────────────────────────────────────────────────
// Tried in order when the primary model returns 429 or 503.
// All are free-tier on OpenRouter (rate-limited but no cost).

export const OR_FREE_FALLBACKS = [
  "google/gemini-2.0-flash-exp:free",        // Gemini Flash free tier
  "google/gemini-2.5-pro-exp-03-25:free",    // Gemini 2.5 Pro free (high quality)
  "deepseek/deepseek-chat-v3-0324:free",     // DeepSeek V3
  "meta-llama/llama-3.3-70b-instruct:free",  // Llama 3.3 70B
  "mistralai/mistral-7b-instruct:free",      // Mistral 7B (last resort)
];

// ── Direct provider fallback models (used when OPENROUTER_API_KEY is absent) ──

const DIRECT_GEMINI_MODEL    = "gemini-2.0-flash";
const DIRECT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const DIRECT_OPENAI_MODEL    = "gpt-4o-mini";

// Two-pass eval lite (same model, exported so evaluate/route.ts can reference it)
export const EVAL_LITE_MODEL    = OR_PRIMARY_MODEL;
export const EVAL_LITE_PROVIDER: Provider = "openrouter";

// ── Route result ───────────────────────────────────────────────────────────────

export interface AIRoute {
  provider: Provider;
  apiKey: string;
  model: string;
  fallbackModels?: string[];
}

// ── Provider availability check ────────────────────────────────────────────────

function getKey(envVar: string): string | null {
  const v = process.env[envVar];
  return v && v.trim() ? v.trim() : null;
}

/**
 * Resolve route for any task — Gemini Flash via OpenRouter with free fallbacks.
 * Falls back to direct Gemini → Anthropic → OpenAI if no OpenRouter key is set.
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

// ── Credit deduction + AI call ─────────────────────────────────────────────────

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
 * Free-tier daily limits are NOT checked here — those are enforced at the
 * API route level before calling this function.
 */
export async function callAI(opts: CallAIOptions): Promise<string> {
  const supabase = await createClient();
  const credits  = CREDIT_COSTS[opts.task];

  const route = opts.routeOverride ?? resolveRoute(opts.task);

  // Deduct credits atomically
  const { data: ok } = await supabase.rpc("deduct_credit", {
    p_user_id: opts.userId,
    p_amount:  credits,
  });
  if (!ok) throw new Error("INSUFFICIENT_CREDITS");

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

  // Fire-and-forget usage log
  supabase.from("usage_log").insert({
    user_id:      opts.userId,
    task_type:    opts.task,
    model:        route.model,
    credits_used: credits,
    byok:         false,
  }).then(() => {});

  return result;
}

export { parseJSON };
