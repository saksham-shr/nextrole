// ============================================================
// Company career page library — specific company job pages
// Mirrors career-ops 45+ pre-configured company URLs.
// Users can add any of these to their scan_sources with one click.
// ============================================================

export type CompanyCategory =
  | "ai_lab"
  | "ai_infra"
  | "voice_ai"
  | "developer_tools"
  | "fintech"
  | "enterprise"
  | "cloud"
  | "data"
  | "security"
  | "consumer"
  | "startup"
  | "contact_center"
  | "european";

export type CompanyPortal = {
  id: string;
  name: string;
  url: string;             // direct career page or ATS board URL
  category: CompanyCategory;
  description: string;
  ats?: string;            // greenhouse | ashby | lever | workday | custom
  tags: string[];
};

export const COMPANIES: CompanyPortal[] = [
  // ── AI Labs ─────────────────────────────────────────────────
  {
    id: "anthropic",
    name: "Anthropic",
    url: "https://boards.greenhouse.io/anthropic",
    category: "ai_lab",
    ats: "greenhouse",
    description: "AI safety company — Claude models, frontier research, alignment.",
    tags: ["ai-safety", "llm", "research"],
  },
  {
    id: "openai",
    name: "OpenAI",
    url: "https://openai.com/careers",
    category: "ai_lab",
    description: "GPT, DALL-E, Sora — frontier AI products and research.",
    tags: ["llm", "research", "products"],
  },
  {
    id: "deepmind",
    name: "Google DeepMind",
    url: "https://deepmind.google/about/careers/",
    category: "ai_lab",
    description: "Google's AI research division — Gemini, AlphaCode, robotics.",
    tags: ["research", "gemini", "robotics"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    url: "https://jobs.lever.co/mistral",
    category: "ai_lab",
    ats: "lever",
    description: "European frontier AI lab — open and proprietary models.",
    tags: ["llm", "european", "open-source"],
  },
  {
    id: "cohere",
    name: "Cohere",
    url: "https://jobs.lever.co/cohere",
    category: "ai_lab",
    ats: "lever",
    description: "Enterprise LLM platform — Command, Embed, Rerank.",
    tags: ["enterprise", "llm", "embeddings"],
  },
  {
    id: "xai",
    name: "xAI",
    url: "https://x.ai/careers",
    category: "ai_lab",
    description: "Elon Musk's AI company — Grok models.",
    tags: ["llm", "research"],
  },
  {
    id: "inflection",
    name: "Inflection AI",
    url: "https://inflection.ai/careers",
    category: "ai_lab",
    description: "Personal AI company — Pi assistant.",
    tags: ["assistant", "llm"],
  },
  {
    id: "turing",
    name: "Turing",
    url: "https://boards.greenhouse.io/turing",
    category: "ai_lab",
    ats: "greenhouse",
    description: "AI platform connecting software engineers with US companies.",
    tags: ["platform", "remote", "engineering"],
  },

  // ── AI Infrastructure ────────────────────────────────────────
  {
    id: "huggingface",
    name: "Hugging Face",
    url: "https://apply.workable.com/huggingface/",
    category: "ai_infra",
    ats: "workable",
    description: "The ML hub — models, datasets, spaces, inference APIs.",
    tags: ["open-source", "ml", "infrastructure"],
  },
  {
    id: "scale-ai",
    name: "Scale AI",
    url: "https://scale.com/careers",
    category: "ai_infra",
    description: "AI data platform — labelling, RLHF, government AI.",
    tags: ["data", "rlhf", "government"],
  },
  {
    id: "together-ai",
    name: "Together AI",
    url: "https://jobs.lever.co/together",
    category: "ai_infra",
    ats: "lever",
    description: "Cloud platform for training and fine-tuning open LLMs.",
    tags: ["infrastructure", "fine-tuning", "cloud"],
  },
  {
    id: "replicate",
    name: "Replicate",
    url: "https://replicate.com/careers",
    category: "ai_infra",
    description: "Run ML models in the cloud via API.",
    tags: ["inference", "api", "developer-tools"],
  },
  {
    id: "modal",
    name: "Modal",
    url: "https://modal.com/careers",
    category: "ai_infra",
    description: "Serverless GPU infrastructure for ML and data workloads.",
    tags: ["gpu", "serverless", "infrastructure"],
  },
  {
    id: "baseten",
    name: "Baseten",
    url: "https://baseten.co/careers",
    category: "ai_infra",
    description: "ML inference infrastructure — deploy any model at scale.",
    tags: ["inference", "deployment", "infrastructure"],
  },
  {
    id: "anyscale",
    name: "Anyscale",
    url: "https://jobs.lever.co/anyscale",
    category: "ai_infra",
    ats: "lever",
    description: "Ray distributed computing for AI/ML workloads.",
    tags: ["distributed", "ray", "ml"],
  },
  {
    id: "wandb",
    name: "Weights & Biases",
    url: "https://boards.greenhouse.io/wandb",
    category: "ai_infra",
    ats: "greenhouse",
    description: "MLOps platform — experiment tracking, model registry, prompts.",
    tags: ["mlops", "tracking", "developer-tools"],
  },
  {
    id: "databricks",
    name: "Databricks",
    url: "https://www.databricks.com/company/careers/open-positions",
    category: "data",
    description: "Data + AI platform — Spark, Delta Lake, MLflow.",
    tags: ["data", "spark", "ml"],
  },

  // ── Voice AI ─────────────────────────────────────────────────
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    url: "https://jobs.ashbyhq.com/elevenlabs",
    category: "voice_ai",
    ats: "ashby",
    description: "AI voice synthesis and cloning — leading voice AI platform.",
    tags: ["voice", "tts", "audio"],
  },
  {
    id: "hume-ai",
    name: "Hume AI",
    url: "https://jobs.ashbyhq.com/hume",
    category: "voice_ai",
    ats: "ashby",
    description: "Empathic voice AI — emotion measurement and expression.",
    tags: ["voice", "emotion", "ai"],
  },
  {
    id: "deepgram",
    name: "Deepgram",
    url: "https://jobs.ashbyhq.com/deepgram",
    category: "voice_ai",
    ats: "ashby",
    description: "Speech AI APIs — STT, TTS, audio intelligence.",
    tags: ["speech", "stt", "api"],
  },
  {
    id: "speechify",
    name: "Speechify",
    url: "https://speechify.com/careers",
    category: "voice_ai",
    description: "Text-to-speech reading tool — consumer AI.",
    tags: ["voice", "consumer", "productivity"],
  },

  // ── Developer Tools ──────────────────────────────────────────
  {
    id: "vercel",
    name: "Vercel",
    url: "https://vercel.com/careers",
    category: "developer_tools",
    description: "Frontend cloud — Next.js, Edge Network, v0.",
    tags: ["frontend", "nextjs", "cloud"],
  },
  {
    id: "linear",
    name: "Linear",
    url: "https://linear.app/careers",
    category: "developer_tools",
    description: "Issue tracking and project management for software teams.",
    tags: ["productivity", "saas", "developer-tools"],
  },
  {
    id: "supabase",
    name: "Supabase",
    url: "https://supabase.com/careers",
    category: "developer_tools",
    description: "Open-source Firebase alternative — Postgres, Auth, Storage.",
    tags: ["open-source", "backend", "postgres"],
  },
  {
    id: "hashicorp",
    name: "HashiCorp",
    url: "https://www.hashicorp.com/jobs",
    category: "developer_tools",
    description: "Infrastructure automation — Terraform, Vault, Consul.",
    tags: ["infra", "devops", "enterprise"],
  },
  {
    id: "grafana",
    name: "Grafana Labs",
    url: "https://grafana.com/about/careers/",
    category: "developer_tools",
    description: "Observability platform — Grafana, Loki, Tempo, Mimir.",
    tags: ["observability", "open-source", "monitoring"],
  },
  {
    id: "retool",
    name: "Retool",
    url: "https://retool.com/careers",
    category: "developer_tools",
    description: "Internal tooling platform — build apps on top of data and APIs.",
    tags: ["low-code", "internal-tools", "developer-tools"],
  },
  {
    id: "postman",
    name: "Postman",
    url: "https://www.postman.com/careers/",
    category: "developer_tools",
    description: "API development and testing platform.",
    tags: ["api", "testing", "developer-tools"],
  },
  {
    id: "figma",
    name: "Figma",
    url: "https://www.figma.com/careers/",
    category: "developer_tools",
    description: "Collaborative design platform — now part of Adobe.",
    tags: ["design", "collaboration", "saas"],
  },

  // ── Fintech ──────────────────────────────────────────────────
  {
    id: "stripe",
    name: "Stripe",
    url: "https://stripe.com/jobs/search",
    category: "fintech",
    description: "Payments infrastructure — APIs, Banking-as-a-Service.",
    tags: ["payments", "api", "infrastructure"],
  },
  {
    id: "plaid",
    name: "Plaid",
    url: "https://plaid.com/careers/",
    category: "fintech",
    description: "Financial data network connecting apps to banks.",
    tags: ["open-banking", "data", "api"],
  },
  {
    id: "brex",
    name: "Brex",
    url: "https://www.brex.com/careers",
    category: "fintech",
    description: "Corporate cards and spend management for startups.",
    tags: ["fintech", "b2b", "startup"],
  },
  {
    id: "rippling",
    name: "Rippling",
    url: "https://www.rippling.com/careers",
    category: "fintech",
    description: "HR, IT, and finance platform for businesses.",
    tags: ["hr-tech", "saas", "platform"],
  },
  {
    id: "mercury",
    name: "Mercury",
    url: "https://mercury.com/jobs",
    category: "fintech",
    description: "Banking for startups and scale-ups.",
    tags: ["banking", "startup", "fintech"],
  },

  // ── Enterprise / Cloud ───────────────────────────────────────
  {
    id: "salesforce",
    name: "Salesforce",
    url: "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site",
    category: "enterprise",
    description: "CRM and cloud platform — Einstein AI, Slack, MuleSoft.",
    tags: ["crm", "enterprise", "saas"],
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    url: "https://jobs.smartrecruiters.com/ServiceNow",
    category: "enterprise",
    ats: "smartrecruiters",
    description: "Digital workflow platform — IT, HR, customer service.",
    tags: ["enterprise", "workflow", "itsm"],
  },
  {
    id: "twilio",
    name: "Twilio",
    url: "https://www.twilio.com/en-us/company/jobs",
    category: "enterprise",
    description: "Communications APIs — SMS, voice, email, WhatsApp.",
    tags: ["communications", "api", "platform"],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    url: "https://www.cloudflare.com/careers/jobs/",
    category: "cloud",
    description: "Security and performance network — edge compute, Workers, AI gateway.",
    tags: ["security", "cdn", "edge"],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    url: "https://careers.snowflake.com/us/en/search-results",
    category: "data",
    description: "Cloud data platform — data warehouse, data sharing.",
    tags: ["data", "cloud", "analytics"],
  },

  // ── Security ─────────────────────────────────────────────────
  {
    id: "crowdstrike",
    name: "CrowdStrike",
    url: "https://www.crowdstrike.com/careers/",
    category: "security",
    description: "Endpoint security and threat intelligence platform.",
    tags: ["security", "cybersecurity", "saas"],
  },
  {
    id: "snyk",
    name: "Snyk",
    url: "https://snyk.io/careers/",
    category: "security",
    description: "Developer security platform — code, containers, IaC.",
    tags: ["security", "developer-tools", "devops"],
  },

  // ── Contact Center / CCaaS ───────────────────────────────────
  {
    id: "intercom",
    name: "Intercom",
    url: "https://www.intercom.com/careers",
    category: "contact_center",
    description: "Customer messaging platform — AI-first support with Fin.",
    tags: ["customer-success", "ai", "saas"],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    url: "https://jobs.lever.co/zendesk",
    category: "contact_center",
    ats: "lever",
    description: "Customer service platform — ticketing, AI, self-service.",
    tags: ["customer-service", "enterprise", "ai"],
  },
  {
    id: "five9",
    name: "Five9",
    url: "https://www.five9.com/about/careers",
    category: "contact_center",
    description: "Cloud contact centre software with AI automation.",
    tags: ["contact-centre", "voice-ai", "enterprise"],
  },

  // ── Consumer / Social ────────────────────────────────────────
  {
    id: "notion",
    name: "Notion",
    url: "https://www.notion.so/careers",
    category: "consumer",
    description: "All-in-one workspace — notes, wikis, databases, AI.",
    tags: ["productivity", "consumer", "saas"],
  },
  {
    id: "discord",
    name: "Discord",
    url: "https://discord.com/jobs",
    category: "consumer",
    description: "Community and messaging platform — gaming and beyond.",
    tags: ["consumer", "community", "platform"],
  },

  // ── European companies ───────────────────────────────────────
  {
    id: "stability-ai",
    name: "Stability AI",
    url: "https://stability.ai/careers",
    category: "european",
    description: "Open generative AI models — Stable Diffusion, SDXL.",
    tags: ["generative-ai", "open-source", "image"],
  },
  {
    id: "aleph-alpha",
    name: "Aleph Alpha",
    url: "https://www.aleph-alpha.com/careers",
    category: "european",
    description: "European sovereign AI — Luminous models, enterprise.",
    tags: ["sovereign-ai", "european", "enterprise"],
  },
  {
    id: "helsing",
    name: "Helsing",
    url: "https://helsing.ai/careers",
    category: "european",
    description: "European defence AI company.",
    tags: ["defence", "european", "ai"],
  },
  {
    id: "wayve",
    name: "Wayve",
    url: "https://wayve.ai/careers/",
    category: "european",
    description: "UK autonomous driving company — embodied AI.",
    tags: ["autonomous-driving", "robotics", "european"],
  },
  {
    id: "revolut",
    name: "Revolut",
    url: "https://www.revolut.com/careers/",
    category: "european",
    description: "UK neobank — banking, crypto, travel, business.",
    tags: ["fintech", "neobank", "european"],
  },
  {
    id: "checkout-com",
    name: "Checkout.com",
    url: "https://www.checkout.com/careers",
    category: "european",
    description: "Global payments infrastructure for digital businesses.",
    tags: ["payments", "fintech", "european"],
  },

  // ── High-growth startups ─────────────────────────────────────
  {
    id: "cursor",
    name: "Cursor",
    url: "https://anysphere.inc/careers",
    category: "startup",
    description: "AI-first code editor built on VS Code.",
    tags: ["developer-tools", "ai", "startup"],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    url: "https://www.perplexity.ai/hub/careers",
    category: "startup",
    description: "AI-powered answer engine / search.",
    tags: ["search", "llm", "startup"],
  },
  {
    id: "luma-ai",
    name: "Luma AI",
    url: "https://lumalabs.ai/careers",
    category: "startup",
    description: "3D capture and generative video — Dream Machine.",
    tags: ["generative-ai", "video", "3d"],
  },
  {
    id: "runway",
    name: "Runway",
    url: "https://runwayml.com/careers/",
    category: "startup",
    description: "AI video and creative tools for filmmakers.",
    tags: ["generative-ai", "video", "creative"],
  },
];

// ── Helpers ──────────────────────────────────────────────────

export type CompanyCategoryMeta = { id: CompanyCategory; label: string };

export const COMPANY_CATEGORIES: CompanyCategoryMeta[] = [
  { id: "ai_lab",         label: "🧠 AI Labs" },
  { id: "ai_infra",       label: "⚙️ AI Infrastructure" },
  { id: "voice_ai",       label: "🎙️ Voice AI" },
  { id: "developer_tools",label: "🛠️ Developer Tools" },
  { id: "fintech",        label: "💳 Fintech" },
  { id: "enterprise",     label: "🏢 Enterprise" },
  { id: "cloud",          label: "☁️ Cloud" },
  { id: "data",           label: "📊 Data" },
  { id: "security",       label: "🔒 Security" },
  { id: "consumer",       label: "📱 Consumer" },
  { id: "contact_center", label: "📞 Contact Centre" },
  { id: "european",       label: "🇪🇺 European" },
  { id: "startup",        label: "🚀 High-Growth Startups" },
];

export function searchCompanies(query: string): CompanyPortal[] {
  const q = query.toLowerCase();
  return COMPANIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q)) ||
      c.category.includes(q),
  );
}

export function getCompaniesByCategory(category: CompanyCategory): CompanyPortal[] {
  return COMPANIES.filter((c) => c.category === category);
}
