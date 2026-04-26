export async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
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

export async function callOpenAI(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content;
}

export async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
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

/** Single dispatch — works for anthropic | openai | gemini */
export async function callProvider(
  provider: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  if (provider === "anthropic") return callAnthropic(apiKey, model, system, user, maxTokens);
  if (provider === "gemini") return callGemini(apiKey, model, system, user, maxTokens);
  return callOpenAI(apiKey, model, system, user, maxTokens);
}

export function parseJSON(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/```$/m, "")
    .trim();
  return JSON.parse(cleaned);
}
