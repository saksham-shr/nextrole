/**
 * Centralized AI routing layer.
 *
 * All API keys come from server .env — no user-supplied (BYOK) keys.
 *
 * Task routing strategy:
 *  - premium_resume  → best quality model (OpenRouter Sonnet → direct Anthropic → GPT-4o)
 *  - autofill        → cheapest model (OpenRouter Gemini Flash Lite → Gemini direct)
 *  - everything else → cheap+fast model (OpenRouter Gemini Flash → Gemini direct → Haiku)
 *
 * OpenRouter is preferred when OPENROUTER_API_KEY is set — one key routes to any model.
 * Direct provider keys are used as fallbacks.
 *
 * Cost tactics:
 *  - Prompt caching enabled for direct Anthropic calls
 *  - max_output_tokens enforced (passed by caller)
 *  - Two-pass evaluation: callers initiate with "lite" model, escalate on request
 */

import { type Provider, callProvider, parseJSON } from "@/lib/ai/providers";
import { CREDIT_COSTS, isPremiumTask, type CreditTask } from "@/lib/ai/gates";
import { createClient } from "@/lib/supabase/server";

// ── OpenRouter model IDs ───────────────────────────────────────────────────────
// Full list: https://openrouter.ai/models

// Premium — highest quality
const OR_PREMIUM_MODEL  = "anthropic/claude-sonnet-4-5";

// Standard — fast & cheap
const OR_STANDARD_MODEL = "google/gemini-2.0-flash-001";

// Autofill — cheapest (lite)
const OR_AUTOFILL_MODEL = "google/gemini-2.0-flash-lite-001";

// Two-pass eval lite model (via OpenRouter)
const OR_EVAL_LITE_MODEL = "google/gemini-2.0-flash-lite-001";

// ── Direct provider fallback models ───────────────────────────────────────────

const PREMIUM_ANTHROPIC_MODEL  = "claude-sonnet-4-6";
const PREMIUM_OPENAI_MODEL     = "gpt-4o";
const STANDARD_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const STANDARD_OPENAI_MODEL    = "gpt-4o-mini";
const STANDARD_GEMINI_MODEL    = "gemini-1.5-flash";
const AUTOFILL_GEMINI_MODEL    = "gemini-1.5-flash-8b";

// Two-pass evaluation screening model (direct Gemini fallback)
export const EVAL_LITE_MODEL    = OR_EVAL_LITE_MODEL;
export const EVAL_LITE_PROVIDER = "openrouter";

// ── Route result ───────────────────────────────────────────────────────────────

export interface AIRoute {
  provider: Provider;
  apiKey: string;
  model: string;
}

// ── Provider availability check ────────────────────────────────────────────────

function getKey(envVar: string): string | null {
  const v = process.env[envVar];
  return v && v.trim() ? v.trim() : null;
}

/**
 * Pick the cheapest healthy provider for standard (non-premium) tasks.
 * Priority: OpenRouter Gemini Flash → Gemini direct → Anthropic Haiku → OpenAI mini
 */
function arbitrateStandard(): AIRoute {
  const orKey        = getKey("OPENROUTER_API_KEY");
  const geminiKey    = getKey("GEMINI_API_KEY");
  const anthropicKey = getKey("ANTHROPIC_API_KEY");
  const openaiKey    = getKey("OPENAI_API_KEY");

  if (orKey) {
    return { provider: "openrouter", apiKey: orKey, model: OR_STANDARD_MODEL };
  }
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey, model: STANDARD_GEMINI_MODEL };
  }
  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, model: STANDARD_ANTHROPIC_MODEL };
  }
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, model: STANDARD_OPENAI_MODEL };
  }
  throw new Error("NO_AI_PROVIDER_CONFIGURED");
}

/**
 * Pick provider for premium (expensive) tasks.
 * Priority: OpenRouter Claude Sonnet → Anthropic direct → OpenAI GPT-4o
 */
function routePremium(): AIRoute {
  const orKey        = getKey("OPENROUTER_API_KEY");
  const anthropicKey = getKey("ANTHROPIC_API_KEY");
  const openaiKey    = getKey("OPENAI_API_KEY");

  if (orKey) {
    return { provider: "openrouter", apiKey: orKey, model: OR_PREMIUM_MODEL };
  }
  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, model: PREMIUM_ANTHROPIC_MODEL };
  }
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, model: PREMIUM_OPENAI_MODEL };
  }
  throw new Error("NO_PREMIUM_AI_PROVIDER_CONFIGURED");
}

/**
 * Route for autofill — cheapest available model.
 * Priority: OpenRouter Gemini Flash Lite → Gemini direct → standard fallback
 */
function routeAutofill(): AIRoute {
  const orKey     = getKey("OPENROUTER_API_KEY");
  const geminiKey = getKey("GEMINI_API_KEY");

  if (orKey) {
    return { provider: "openrouter", apiKey: orKey, model: OR_AUTOFILL_MODEL };
  }
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey, model: AUTOFILL_GEMINI_MODEL };
  }
  return arbitrateStandard();
}

/**
 * Resolve the correct AI route for a given task type.
 */
export function resolveRoute(task: CreditTask): AIRoute {
  if (task === "resume_premium") return routePremium();
  if (task === "autofill")       return routeAutofill();
  return arbitrateStandard();
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
    provider:  route.provider,
    apiKey:    route.apiKey,
    model:     route.model,
    system:    opts.system,
    user:      opts.user,
    maxTokens: opts.maxTokens ?? 2048,
    cache:     route.provider === "anthropic", // prompt caching only for direct Anthropic calls
    json:      true,
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
