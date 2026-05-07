/**
 * Centralized AI routing layer.
 *
 * All API keys come from server .env — no user-supplied (BYOK) keys.
 *
 * Task routing strategy:
 *  - premium_resume  → expensive model (GPT-4o / Claude Sonnet)
 *  - autofill        → Gemini Flash Lite (cheapest)
 *  - everything else → cheap model (GPT-4o-mini / Claude Haiku / Gemini Flash)
 *                      with real-time provider arbitrage (pick first healthy key)
 *
 * Cost tactics:
 *  - Prompt caching enabled for Anthropic calls
 *  - max_output_tokens enforced (passed by caller)
 *  - Two-pass evaluation: callers initiate with "lite" model, escalate on request
 */

import { type Provider, callProvider, parseJSON } from "@/lib/ai/providers";
import { CREDIT_COSTS, isPremiumTask, type CreditTask } from "@/lib/ai/gates";
import { createClient } from "@/lib/supabase/server";

// ── Model constants ────────────────────────────────────────────────────────────

// Premium tasks
const PREMIUM_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const PREMIUM_OPENAI_MODEL    = "gpt-4o";

// Standard tasks
const STANDARD_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const STANDARD_OPENAI_MODEL    = "gpt-4o-mini";
const STANDARD_GEMINI_MODEL    = "gemini-1.5-flash";

// Autofill — cheapest available
const AUTOFILL_GEMINI_MODEL = "gemini-1.5-flash-8b";

// Two-pass evaluation screening model
export const EVAL_LITE_MODEL    = "gemini-1.5-flash-8b";
export const EVAL_LITE_PROVIDER = "gemini";

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
 * Priority: Gemini Flash → Anthropic Haiku → OpenAI mini
 */
function arbitrateStandard(): AIRoute {
  const geminiKey    = getKey("GEMINI_API_KEY");
  const anthropicKey = getKey("ANTHROPIC_API_KEY");
  const openaiKey    = getKey("OPENAI_API_KEY");

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
 * Priority: Anthropic Sonnet → OpenAI GPT-4o
 */
function routePremium(): AIRoute {
  const anthropicKey = getKey("ANTHROPIC_API_KEY");
  const openaiKey    = getKey("OPENAI_API_KEY");

  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, model: PREMIUM_ANTHROPIC_MODEL };
  }
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, model: PREMIUM_OPENAI_MODEL };
  }
  throw new Error("NO_PREMIUM_AI_PROVIDER_CONFIGURED");
}

/**
 * Route for autofill — always Gemini Flash Lite, fallback to standard.
 */
function routeAutofill(): AIRoute {
  const geminiKey = getKey("GEMINI_API_KEY");
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
    cache:     route.provider === "anthropic",
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
