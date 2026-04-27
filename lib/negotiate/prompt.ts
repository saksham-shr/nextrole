// ============================================================
// Negotiation toolkit prompt
// Produces counter-offer scripts, BATNA analysis, geo rebuttals,
// and competing-offer leverage framing.
// ============================================================

export const NEGOTIATE_SYSTEM_PROMPT = `You are an expert salary negotiation coach with deep knowledge of tech compensation, market rates, and negotiation psychology. You produce rigorous, actionable negotiation strategies.

You MUST respond with valid JSON only — no markdown, no prose, no code fences. Match this exact structure:

{
  "summary": "<2-3 sentence overall assessment of the negotiation position>",
  "position_strength": "<strong | moderate | weak>",
  "counter_offer": {
    "recommended_amount": <number — the amount to counter at>,
    "rationale": "<why this specific number>",
    "script": "<verbatim script for the counter-offer conversation or email opening paragraph>"
  },
  "talking_points": [
    "<point 1 — specific and concrete>",
    "<point 2>",
    "<point 3>"
  ],
  "batna": {
    "assessment": "<honest assessment of walk-away leverage>",
    "walk_away_point": "<the minimum acceptable number and why>",
    "alternatives": ["<alternative 1 if offer rejected>", "<alternative 2>"]
  },
  "email_draft": "<full ready-to-send negotiation email — professional, specific, confident but not aggressive>",
  "geo_rebuttal": "<if location discount is mentioned: specific rebuttal with market data framing — or null if not applicable>",
  "competing_offer_leverage": "<if competing offer exists: how to use it without burning bridges — or null if not applicable>",
  "equity_angle": "<any equity/RSU negotiation points if relevant — or null>",
  "timing_advice": "<when and how to deliver the counter — urgency, medium, tone>",
  "risks": ["<risk 1>", "<risk 2>"]
}`;

export interface NegotiateInput {
  job_title?: string | null;
  company?: string | null;
  offer_amount: number;
  currency?: string | null;
  competing_offer?: number | null;
  location?: string | null;
  current_comp?: number | null;
  target_comp?: number | null;
  base_cv?: string | null;
  notes?: string | null;
}

export function buildNegotiatePrompt(input: NegotiateInput): string {
  const currency = input.currency ?? "USD";
  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;

  const lines: string[] = [];

  if (input.job_title || input.company) {
    lines.push(`Role: ${input.job_title ?? "unknown"} at ${input.company ?? "unknown"}`);
  }

  lines.push(`Offer received: ${fmt(input.offer_amount)}`);

  if (input.current_comp) {
    lines.push(`Current total comp: ${fmt(input.current_comp)}`);
    const delta = input.offer_amount - input.current_comp;
    const pct = ((delta / input.current_comp) * 100).toFixed(1);
    lines.push(`Change vs current: ${delta >= 0 ? "+" : ""}${fmt(delta)} (${pct}%)`);
  }

  if (input.target_comp) {
    lines.push(`Target total comp: ${fmt(input.target_comp)}`);
    const gap = input.target_comp - input.offer_amount;
    lines.push(`Gap to target: ${fmt(gap)} (${gap > 0 ? "offer is below target" : "offer meets or exceeds target"})`);
  }

  if (input.competing_offer) {
    lines.push(`Competing offer: ${fmt(input.competing_offer)}`);
  }

  if (input.location) {
    lines.push(`Location context: ${input.location}`);
  }

  if (input.notes) {
    lines.push(`\nAdditional context:\n${input.notes}`);
  }

  if (input.base_cv) {
    lines.push(`\nCandidate background (use to strengthen talking points):\n${input.base_cv.slice(0, 1500)}`);
  }

  lines.push(`\nProduce a complete negotiation strategy as JSON.`);

  return lines.join("\n");
}
