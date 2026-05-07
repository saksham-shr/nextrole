/**
 * Multi-provider AI dispatch layer.
 * Supports OpenRouter, Anthropic, OpenAI, Google Gemini, and Sarvam AI.
 * All API keys come from .env — no user-supplied keys.
 *
 * Cost optimizations applied here:
 *  - Anthropic: prompt caching via cache_control (ephemeral) on system prompt
 *  - Gemini: system_instruction with cachedContent support (provider-side)
 *  - max_output_tokens enforced on every call
 *  - Token-efficient JSON-only prompts expected from callers
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
  /** Expect JSON back — adds response_format: json_object for OpenAI */
  json?: boolean;
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

// ── OpenRouter ────────────────────────────────────────────────────────────────
// OpenAI-compatible endpoint that proxies 300+ models.
// JSON mode is only passed for models that declare it; others rely on system prompt.

async function callOpenRouter(opts: CallOptions): Promise<string> {
  const { apiKey, model, system, user, maxTokens = 2048, json = true } = opts;

  const supportsJsonMode =
    model.startsWith("openai/") ||
    model.startsWith("anthropic/") ||
    model.startsWith("google/gemini");

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (json && supportsJsonMode) body.response_format = { type: "json_object" };

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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
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
