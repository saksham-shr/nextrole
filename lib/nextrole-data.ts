export const navGroups: Array<{
  title: string;
  items: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Activity", href: "/dashboard/activity" },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { label: "Evaluate", href: "/dashboard/evaluate" },
      { label: "Compare", href: "/dashboard/compare" },
      { label: "Batch", href: "/dashboard/batch" },
      { label: "Pipeline", href: "/dashboard/pipeline" },
      { label: "Scanner", href: "/dashboard/scanner" },
      { label: "Tracker", href: "/dashboard/tracker" },
    ],
  },
  {
    title: "Documents",
    items: [
      { label: "Reports", href: "/dashboard/reports" },
      { label: "Resumes", href: "/dashboard/resumes" },
      { label: "CV", href: "/dashboard/cv" },
    ],
  },
  {
    title: "Coaching",
    items: [
      { label: "Interview Prep", href: "/dashboard/interview-prep" },
      { label: "Story Bank", href: "/dashboard/story-bank" },
      { label: "Apply", href: "/dashboard/apply" },
      { label: "Follow-up", href: "/dashboard/followup" },
      { label: "Negotiate", href: "/dashboard/negotiate" },
      { label: "Patterns", href: "/dashboard/patterns" },
      { label: "Deep Research", href: "/dashboard/deep" },
      { label: "Contact", href: "/dashboard/contact" },
      { label: "Training", href: "/dashboard/training" },
      { label: "Project", href: "/dashboard/project" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/dashboard/profile" },
      { label: "Providers", href: "/dashboard/providers" },
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Get Started", href: "/dashboard/onboarding" },
    ],
  },
];

export const quickActions = [
  { label: "Evaluate Job", href: "/dashboard/evaluate" },
  { label: "Run Scan", href: "/dashboard/scanner" },
  { label: "Batch Import", href: "/dashboard/batch" },
  { label: "Add Manual Job", href: "/dashboard/pipeline" },
  { label: "Generate Tailored Resume", href: "/dashboard/resumes" },
  { label: "Open Tracker", href: "/dashboard/tracker" },
  { label: "Retry Failed Task", href: "/dashboard/activity" },
] as const;

export const kpis: Array<{
  label: string;
  value: string;
  sublabel: string;
  tone?: "default" | "accent" | "ok" | "warn" | "bad";
}> = [
  { label: "Jobs", value: "142", sublabel: "+12 this week" },
  { label: "Active Apps", value: "24", sublabel: "7 waiting", tone: "accent" },
  { label: "Interviews", value: "6", sublabel: "2 this week" },
  { label: "Offers", value: "1", sublabel: "final loop active", tone: "ok" },
  { label: "Response", value: "18%", sublabel: "up 3% vs last month" },
  { label: "Avg Score", value: "71", sublabel: "evaluated roles" },
];

export const activityFeed = [
  {
    title: "Evaluation completed",
    subtitle: "Stripe IC4 platform role scored 84 with strong apply recommendation",
    time: "2m",
  },
  {
    title: "Resume generated",
    subtitle: "Vercel senior engineer PDF saved to tracker assets",
    time: "14m",
  },
  {
    title: "Scan finished",
    subtitle: "Lever and Ashby run produced 8 fresh matches",
    time: "1h",
  },
  {
    title: "Follow-up drafted",
    subtitle: "Notion day-7 bump queued for review",
    time: "3h",
  },
  {
    title: "Interview prep created",
    subtitle: "Stripe onsite pack mapped to 4 rounds and 6 stories",
    time: "yesterday",
  },
] as const;

export const trackerRows = [
  {
    job: "Senior Product Engineer",
    company: "Linear",
    stage: "Evaluated",
    score: "87",
    archetype: "Product Eng",
    source: "Manual URL",
    nextAction: "Tailor resume",
    followup: "N/A",
  },
  {
    job: "Platform Engineer IC4",
    company: "Stripe",
    stage: "Interview",
    score: "84",
    archetype: "Platform",
    source: "Scanner",
    nextAction: "Prep onsite",
    followup: "Post-panel note",
  },
  {
    job: "Senior SWE",
    company: "Vercel",
    stage: "Applied",
    score: "78",
    archetype: "Backend",
    source: "Career page",
    nextAction: "Day-7 follow-up",
    followup: "Due tomorrow",
  },
  {
    job: "Staff PM",
    company: "Notion",
    stage: "Pending",
    score: "72",
    archetype: "PM",
    source: "Batch",
    nextAction: "Review evaluation",
    followup: "N/A",
  },
] as const;

export const kanbanColumns = [
  { title: "Pending", items: ["Notion Staff PM", "Cursor Engineering Manager"] },
  { title: "Evaluated", items: ["Linear Senior Product Engineer", "Plaid Staff Backend"] },
  { title: "Applied", items: ["Vercel Senior SWE", "Figma Product Engineer"] },
  { title: "Interview", items: ["Stripe IC4 Platform", "Retool Staff Infra"] },
  { title: "Offer", items: ["Acme Platform Lead"] },
] as const;

export const discoveries = [
  {
    role: "Senior Backend Engineer",
    company: "Plaid",
    source: "plaid.com/careers",
    freshness: "2h",
    score: "84",
    reason: "Platform + payments overlap",
  },
  {
    role: "Staff PM",
    company: "Notion",
    source: "Lever saved source",
    freshness: "6h",
    score: "72",
    reason: "Strong domain fit, stretch level",
  },
  {
    role: "Engineering Manager",
    company: "Cursor",
    source: "Custom list",
    freshness: "12h",
    score: "65",
    reason: "Leadership heavy, low IC alignment",
  },
] as const;

export const reports = [
  {
    id: "stripe-ic4-platform",
    title: "Stripe IC4 platform report",
    score: "84",
    company: "Stripe",
    type: "Full evaluation",
  },
  {
    id: "linear-senior-product-engineer",
    title: "Linear senior product engineer report",
    score: "87",
    company: "Linear",
    type: "Full pipeline package",
  },
] as const;

export const resumes = [
  {
    id: "vercel-senior-swe-v1",
    title: "Vercel senior SWE tailored resume",
    company: "Vercel",
    status: "final",
    coverage: "91%",
  },
  {
    id: "stripe-ic4-platform-v2",
    title: "Stripe IC4 platform tailored resume",
    company: "Stripe",
    status: "draft",
    coverage: "88%",
  },
] as const;

export const stories = [
  {
    title: "Recovered a failing launch",
    competency: "Ownership",
    archetype: "Product Eng",
    impact: "High",
  },
  {
    title: "Reduced infra spend by 28%",
    competency: "Execution",
    archetype: "Backend",
    impact: "High",
  },
  {
    title: "Influenced roadmap without authority",
    competency: "Influence",
    archetype: "PM",
    impact: "Medium",
  },
] as const;

export const providers = [
  {
    name: "Anthropic",
    status: "Connected",
    mode: "API",
    lastRun: "2 minutes ago",
    model: "Claude Sonnet",
  },
  {
    name: "OpenAI",
    status: "Ready",
    mode: "API",
    lastRun: "Not used today",
    model: "GPT-5",
  },
  {
    name: "Manual Chat Mode",
    status: "Enabled",
    mode: "Manual",
    lastRun: "Last import 3 days ago",
    model: "Claude Pro / ChatGPT Plus",
  },
] as const;

export const scanSources = [
  {
    name: "Saved target company set",
    type: "Company list",
    roles: "Platform, product eng, staff IC",
    region: "US / Remote",
    success: "92%",
  },
  {
    name: "Ashby high-signal startups",
    type: "ATS feed",
    roles: "Backend, infra, product",
    region: "US / EU",
    success: "84%",
  },
] as const;

export const taskRuns = [
  {
    name: "Batch evaluate: platform shortlist",
    type: "batch",
    status: "Running",
    output: "7/14 roles completed",
  },
  {
    name: "Resume PDF: Stripe IC4 platform",
    type: "pdf",
    status: "Completed",
    output: "Saved to resumes library",
  },
  {
    name: "Follow-up draft: Notion day-7",
    type: "followup",
    status: "Failed",
    output: "Provider key needs refresh",
  },
] as const;

export const repoParity = [
  "Auto-pipeline",
  "Offer evaluation",
  "Offer comparison",
  "Batch processing",
  "Portal scanning",
  "Tracker",
  "PDF generation",
  "Interview prep",
  "Story bank",
  "Apply assistant",
  "Follow-up cadence",
  "Pattern analysis",
  "Deep company research",
  "Contact outreach",
  "Training evaluation",
  "Project evaluation",
  "Multi-language modes",
  "Dedup, merge, liveness, normalization",
] as const;

const dashboardRouteInfo = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Good morning. Your whole search in one operational view.",
  },
  activity: {
    title: "Activity",
    subtitle: "Background runs, artifacts, retries, and system-visible history.",
  },
  evaluate: {
    title: "Evaluate",
    subtitle: "Paste a URL or job description and run the Career Ops scoring flow.",
  },
  compare: {
    title: "Compare",
    subtitle: "Rank evaluated roles side by side and decide what deserves energy.",
  },
  batch: {
    title: "Batch",
    subtitle: "Queue many opportunities and process them through one workflow.",
  },
  pipeline: {
    title: "Pipeline",
    subtitle: "Triage pending roles before they become tracked applications.",
  },
  scanner: {
    title: "Scanner",
    subtitle: "Discover fresh jobs from saved sources and career portals.",
  },
  tracker: {
    title: "Tracker",
    subtitle: "Run the application pipeline with statuses, notes, and linked assets.",
  },
  reports: {
    title: "Reports",
    subtitle: "Long-form evaluation reports, decisions, and role artifacts.",
  },
  "reports.detail": {
    title: "Report Detail",
    subtitle: "Read, rerun, compare, and turn insight into action.",
  },
  resumes: {
    title: "Resumes",
    subtitle: "Tailored resume library with PDF exports and coverage notes.",
  },
  "resumes.detail": {
    title: "Resume Detail",
    subtitle: "Review one tailored resume and its alignment to the target role.",
  },
  cv: {
    title: "CV",
    subtitle: "Maintain the base CV and proof-point source that powers the system.",
  },
  profile: {
    title: "Profile",
    subtitle: "Configure role targets, compensation boundaries, and targeting logic.",
  },
  providers: {
    title: "Providers",
    subtitle: "Choose API or manual execution mode and manage provider defaults.",
  },
  settings: {
    title: "Settings",
    subtitle: "Account preferences, notifications, security, and output defaults.",
  },
  "interview-prep": {
    title: "Interview Prep",
    subtitle: "Build round-by-round packs from tracked jobs and saved stories.",
  },
  "story-bank": {
    title: "Story Bank",
    subtitle: "Store, refine, and reuse STAR+R stories across interviews.",
  },
  apply: {
    title: "Apply",
    subtitle: "Generate tailored application answers without auto-submitting anywhere.",
  },
  followup: {
    title: "Follow-up",
    subtitle: "Track urgency, generate drafts, and manage outreach timing.",
  },
  patterns: {
    title: "Patterns",
    subtitle: "Analyze the funnel and improve targeting across time.",
  },
  deep: {
    title: "Deep Research",
    subtitle: "Generate company dossiers, interview angles, and role context.",
  },
  contact: {
    title: "Contact",
    subtitle: "Create networking messages for recruiters, managers, and peers.",
  },
  training: {
    title: "Training",
    subtitle: "Score certifications and courses against the job search strategy.",
  },
  project: {
    title: "Project",
    subtitle: "Evaluate portfolio ideas by hiring signal, scope, and leverage.",
  },
  negotiate: {
    title: "Negotiate",
    subtitle: "Counter-offer scripts, BATNA analysis, and ready-to-send negotiation emails.",
  },
  onboarding: {
    title: "Get Started",
    subtitle: "5-step setup: profile, CV, provider, targeting, and your first evaluate.",
  },
} as const;

export type DashboardRouteKey = keyof typeof dashboardRouteInfo;

export type DashboardRoute = {
  key: DashboardRouteKey;
  href: string;
  params?: string[];
  title: string;
  subtitle: string;
};

export function resolveDashboardRoute(slug: string[]): DashboardRoute {
  if (slug.length === 0) {
    return {
      key: "dashboard",
      href: "/dashboard",
      ...dashboardRouteInfo.dashboard,
    };
  }

  if (slug[0] === "reports" && slug[1]) {
    return {
      key: "reports.detail",
      href: `/dashboard/reports/${slug[1]}`,
      params: slug,
      ...dashboardRouteInfo["reports.detail"],
    };
  }

  if (slug[0] === "resumes" && slug[1]) {
    return {
      key: "resumes.detail",
      href: `/dashboard/resumes/${slug[1]}`,
      params: slug,
      ...dashboardRouteInfo["resumes.detail"],
    };
  }

  const key = slug[0] as DashboardRouteKey;
  const info = dashboardRouteInfo[key];

  if (!info) {
    return {
      key: "dashboard",
      href: "/dashboard/unknown",
      params: slug,
      ...dashboardRouteInfo.dashboard,
    };
  }

  return {
    key,
    href: `/dashboard/${slug[0]}`,
    params: slug,
    ...info,
  };
}

export function isKnownDashboardRoute(key: string): key is DashboardRouteKey {
  return key in dashboardRouteInfo;
}
