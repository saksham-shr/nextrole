/**
 * Multi-provider AI dispatch layer.
 * Supports OpenRouter, Anthropic, OpenAI, Google Gemini, and Sarvam AI.
 * All API keys come from .env — no user-supplied keys.
 *
 * OpenRouter is the primary provider. On 429/503 it automatically walks
 * through `fallbackModels` (free-tier models) before giving up.
 */

export type Provider = "openrouter" | "anthropic" | "openai" | "gemini" | "sarvam";

export interface CallOptions {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  /** Enables Anthropic prompt caching on the system message */
  cache?: boolean;
  /** Expect JSON back — adds response_format: json_object where supported */
  json?: boolean;
  /**
   * OpenRouter only — models to try in order if the primary is rate-limited.
   * Each entry is attempted once before moving to the next.
   */
  fallbackModels?: string[];
}

// ── Anthropic ──────────────────────────────────────────────────────────────────

async function callAnthropic(opts: CallOptions): Promise<string> {
  const { apiKey, model, system, user, maxTokens = 2048, cache = true } = opts;

  const systemContent = cache
    ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
    : system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemContent,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { content: Array<{ text: string }> };
  return data.content[0].text;
}

// ── OpenAI ─────────────────────────────────────────────────────────────────────

async function callOpenAI(opts: CallOptions): Promise<string> {
  const { apiKey, model, system, user, maxTokens = 2048, json = true } = opts;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

// ── OpenRouter ─────────────────────────────────────────────────────────────────
// OpenAI-compatible endpoint that proxies 300+ models.
// Retries with `fallbackModels` on 429 (rate limit) or 503 (overload).

function supportsJsonMode(model: string): boolean {
  return (
    model.startsWith("openai/") ||
    model.startsWith("anthropic/") ||
    model.startsWith("google/gemini") ||
    model.startsWith("deepseek/")
  );
}

async function callOpenRouterOnce(
  apiKey: string,
  model: string,
  baseBody: Record<string, unknown>,
  json: boolean,
): Promise<{ ok: boolean; status: number; text: string }> {
  const body = { ...baseBody, model } as Record<string, unknown>;
  if (json && supportsJsonMode(model)) body.response_format = { type: "json_object" };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextrole.live",
      "X-Title": "NextRole",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function callOpenRouter(opts: CallOptions): Promise<string> {
  const {
    apiKey,
    model,
    system,
    user,
    maxTokens = 2048,
    json = true,
    fallbackModels = [],
  } = opts;

  const baseBody: Record<string, unknown> = {
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  const modelsToTry = [model, ...fallbackModels];
  const rateLimitStatuses = new Set([429, 503, 529]);
  let lastError = "";

  for (const m of modelsToTry) {
    const { ok, status, text } = await callOpenRouterOnce(apiKey, m, baseBody, json);

    if (ok) {
      const data = JSON.parse(text) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error(`OpenRouter: empty response from ${m}`);
      return content;
    }

    if (rateLimitStatuses.has(status)) {
      console.warn(`[OpenRouter] ${m} rate-limited (${status}), trying next model...`);
      lastError = `${m} → ${status}`;
      continue;
    }

    // Non-retryable error
    throw new Error(`OpenRouter ${status} (${m}): ${text}`);
  }

  throw new Error(`OpenRouter: all models rate-limited. Last: ${lastError}`);
}

// ── Google Gemini ──────────────────────────────────────────────────────────────

async function callGemini(opts: CallOptions): Promise<string> {
  const { apiKey, model, system, user, maxTokens = 2048 } = opts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0].content.parts[0].text;
}

// ── Sarvam AI ──────────────────────────────────────────────────────────────────

async function callSarvam(opts: CallOptions): Promise<string> {
  const { apiKey, model, system, user, maxTokens = 2048 } = opts;

  const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sarvam ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

// ── Dispatch ───────────────────────────────────────────────────────────────────

export async function callProvider(opts: CallOptions): Promise<string> {
  switch (opts.provider) {
    case "openrouter": return callOpenRouter(opts);
    case "anthropic":  return callAnthropic(opts);
    case "openai":     return callOpenAI(opts);
    case "gemini":     return callGemini(opts);
    case "sarvam":     return callSarvam(opts);
  }
}

// ── JSON parsing ───────────────────────────────────────────────────────────────

export function parseJSON(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/```$/m, "")
    .trim();
  return JSON.parse(cleaned);
}
