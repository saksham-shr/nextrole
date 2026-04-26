// ============================================================
// Scanner portal library — pre-configured job board portals
// Mirrors career-ops curated portal list.
// Each entry is ready to use as a ScanSource.
// ============================================================

export type PortalCategory =
  | "general"
  | "tech"
  | "startup"
  | "remote"
  | "executive"
  | "contract"
  | "fintech"
  | "design"
  | "data"
  | "devops"
  | "uk"
  | "us"
  | "eu";

export type Portal = {
  id: string;               // stable slug
  name: string;
  url: string;
  category: PortalCategory;
  description: string;
  tags: string[];
};

export const PORTALS: Portal[] = [
  // ── General ──────────────────────────────────────────────────
  {
    id: "linkedin",
    name: "LinkedIn Jobs",
    url: "https://www.linkedin.com/jobs/search/",
    category: "general",
    description: "The largest professional job board globally.",
    tags: ["networking", "all-levels", "global"],
  },
  {
    id: "indeed",
    name: "Indeed",
    url: "https://www.indeed.com/jobs",
    category: "general",
    description: "Aggregates listings from company sites and job boards.",
    tags: ["aggregator", "global", "volume"],
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    url: "https://www.glassdoor.com/Job/index.htm",
    category: "general",
    description: "Jobs with company reviews and salary data.",
    tags: ["salaries", "reviews", "global"],
  },
  {
    id: "monster",
    name: "Monster",
    url: "https://www.monster.com/jobs/search",
    category: "general",
    description: "Classic job board with broad industry coverage.",
    tags: ["general", "global"],
  },
  {
    id: "ziprecruiter",
    name: "ZipRecruiter",
    url: "https://www.ziprecruiter.com/jobs-search",
    category: "general",
    description: "AI-matched job recommendations, strong in US market.",
    tags: ["us", "ai-matching"],
  },
  {
    id: "simplyhired",
    name: "SimplyHired",
    url: "https://www.simplyhired.com/search",
    category: "general",
    description: "Aggregates listings; good salary estimations.",
    tags: ["aggregator", "us"],
  },

  // ── Tech ─────────────────────────────────────────────────────
  {
    id: "stackoverflow-jobs",
    name: "Stack Overflow Jobs",
    url: "https://stackoverflow.com/jobs",
    category: "tech",
    description: "Developer-focused listings; quality over quantity.",
    tags: ["developers", "tech"],
  },
  {
    id: "github-jobs",
    name: "GitHub Jobs",
    url: "https://jobs.github.com",
    category: "tech",
    description: "Open-source friendly tech roles.",
    tags: ["open-source", "developers"],
  },
  {
    id: "dice",
    name: "Dice",
    url: "https://www.dice.com/jobs",
    category: "tech",
    description: "US tech specialist job board.",
    tags: ["us", "tech", "specialist"],
  },
  {
    id: "techjobsforgood",
    name: "Tech Jobs for Good",
    url: "https://www.techjobsforgood.com",
    category: "tech",
    description: "Tech roles at mission-driven organisations.",
    tags: ["mission-driven", "impact"],
  },
  {
    id: "techcareers",
    name: "TechCareers",
    url: "https://www.techcareers.com/search/jobs",
    category: "tech",
    description: "High-volume tech listings from US companies.",
    tags: ["us", "tech"],
  },
  {
    id: "hired",
    name: "Hired",
    url: "https://hired.com/jobs",
    category: "tech",
    description: "Tech & sales roles with salary transparency; candidates get inbound offers.",
    tags: ["inbound", "salary-first", "tech"],
  },

  // ── Startup ──────────────────────────────────────────────────
  {
    id: "ycombinator-jobs",
    name: "Y Combinator Jobs",
    url: "https://www.ycombinator.com/jobs",
    category: "startup",
    description: "Roles at YC-backed companies — pre-seed to Series C.",
    tags: ["yc", "early-stage", "high-growth"],
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList Talent)",
    url: "https://wellfound.com/jobs",
    category: "startup",
    description: "Startup jobs with equity data and direct founder contact.",
    tags: ["equity", "startups", "direct"],
  },
  {
    id: "startupsofamerica",
    name: "Startups of America",
    url: "https://www.startups.com/jobs",
    category: "startup",
    description: "Curated startup jobs across the US.",
    tags: ["us", "startups"],
  },
  {
    id: "workinstartups",
    name: "Work in Startups",
    url: "https://workinstartups.com/job-board",
    category: "startup",
    description: "UK startup job board — seed to growth stage.",
    tags: ["uk", "startups"],
  },
  {
    id: "eu-startups-jobs",
    name: "EU-Startups Jobs",
    url: "https://eu-startups.com/jobs/",
    category: "startup",
    description: "European startup ecosystem jobs.",
    tags: ["eu", "startups"],
  },

  // ── Remote ───────────────────────────────────────────────────
  {
    id: "remoteok",
    name: "Remote OK",
    url: "https://remoteok.com",
    category: "remote",
    description: "High-volume remote-only job board; strong in tech.",
    tags: ["remote", "global", "tech"],
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com",
    category: "remote",
    description: "Curated remote roles; strong in product and engineering.",
    tags: ["remote", "tech", "product"],
  },
  {
    id: "remotive",
    name: "Remotive",
    url: "https://remotive.com/remote-jobs",
    category: "remote",
    description: "Remote tech, product, and design jobs.",
    tags: ["remote", "tech", "product"],
  },
  {
    id: "jobspresso",
    name: "Jobspresso",
    url: "https://jobspresso.co",
    category: "remote",
    description: "Hand-curated remote jobs in tech and marketing.",
    tags: ["remote", "curated"],
  },
  {
    id: "remote-co",
    name: "Remote.co",
    url: "https://remote.co/remote-jobs/",
    category: "remote",
    description: "Remote jobs with company culture information.",
    tags: ["remote", "culture"],
  },
  {
    id: "nodesk",
    name: "NoDesk",
    url: "https://nodesk.co/remote-jobs/",
    category: "remote",
    description: "Remote job aggregator focused on tech roles.",
    tags: ["remote", "tech", "aggregator"],
  },

  // ── Executive ────────────────────────────────────────────────
  {
    id: "exec-appointments",
    name: "Exec Appointments",
    url: "https://www.execappointments.com",
    category: "executive",
    description: "C-suite and VP-level listings.",
    tags: ["executive", "uk"],
  },
  {
    id: "theladders",
    name: "The Ladders",
    url: "https://www.theladders.com/jobs",
    category: "executive",
    description: "High-salary ($100k+) roles, senior to executive.",
    tags: ["executive", "senior", "us"],
  },
  {
    id: "biospace",
    name: "BioSpace",
    url: "https://www.biospace.com/jobs/",
    category: "executive",
    description: "Life sciences leadership and individual contributor roles.",
    tags: ["biotech", "pharma", "life-sciences"],
  },

  // ── Contract / Freelance ─────────────────────────────────────
  {
    id: "toptal",
    name: "Toptal",
    url: "https://www.toptal.com/freelance-jobs",
    category: "contract",
    description: "Elite freelance network — vetted developers, designers, finance experts.",
    tags: ["freelance", "vetted", "global"],
  },
  {
    id: "gun-io",
    name: "Gun.io",
    url: "https://gun.io/find-work/",
    category: "contract",
    description: "Senior freelance developer marketplace.",
    tags: ["freelance", "developers", "us"],
  },
  {
    id: "contra",
    name: "Contra",
    url: "https://contra.com/jobs",
    category: "contract",
    description: "Commission-free freelance platform for independents.",
    tags: ["freelance", "commission-free"],
  },
  {
    id: "upwork",
    name: "Upwork",
    url: "https://www.upwork.com/search/jobs/",
    category: "contract",
    description: "Largest freelance marketplace; high volume across all skills.",
    tags: ["freelance", "global", "volume"],
  },

  // ── Fintech ──────────────────────────────────────────────────
  {
    id: "efinancialcareers",
    name: "eFinancialCareers",
    url: "https://www.efinancialcareers.com",
    category: "fintech",
    description: "Finance and fintech specialist board — strong in London and NYC.",
    tags: ["finance", "fintech", "uk", "us"],
  },
  {
    id: "fintech-jobs",
    name: "Fintech Jobs",
    url: "https://fintechjobs.com",
    category: "fintech",
    description: "Curated fintech-specific listings.",
    tags: ["fintech", "global"],
  },

  // ── Design ───────────────────────────────────────────────────
  {
    id: "dribbble-jobs",
    name: "Dribbble Jobs",
    url: "https://dribbble.com/jobs",
    category: "design",
    description: "Design roles from companies that hire top designers.",
    tags: ["design", "ux", "global"],
  },
  {
    id: "designerjobs",
    name: "Designer Jobs",
    url: "https://www.designerjobs.co/jobs",
    category: "design",
    description: "Curated design and UX jobs.",
    tags: ["design", "ux"],
  },
  {
    id: "authentic-jobs",
    name: "Authentic Jobs",
    url: "https://authenticjobs.com",
    category: "design",
    description: "Web design and development jobs.",
    tags: ["design", "frontend"],
  },

  // ── Data / ML ────────────────────────────────────────────────
  {
    id: "datasciencejobs",
    name: "Data Science Jobs",
    url: "https://www.datasciencejobs.com",
    category: "data",
    description: "Data science and analytics specialist board.",
    tags: ["data", "ml", "analytics"],
  },
  {
    id: "ai-jobs-net",
    name: "AI Jobs",
    url: "https://aijobs.net",
    category: "data",
    description: "AI, ML, and data engineering roles.",
    tags: ["ai", "ml", "data"],
  },
  {
    id: "kaggle-jobs",
    name: "Kaggle Jobs",
    url: "https://www.kaggle.com/jobs",
    category: "data",
    description: "Data science roles posted to the Kaggle community.",
    tags: ["data", "ml", "kaggle"],
  },

  // ── DevOps / Platform ────────────────────────────────────────
  {
    id: "devops-jobs",
    name: "DevOps Jobs",
    url: "https://devopsjobs.net",
    category: "devops",
    description: "DevOps, SRE, and platform engineering roles.",
    tags: ["devops", "sre", "platform"],
  },
  {
    id: "sysadmin-jobs",
    name: "SysAdmin Jobs",
    url: "https://www.systemadministratorjobs.com",
    category: "devops",
    description: "Systems and infrastructure engineering roles.",
    tags: ["sysadmin", "infra"],
  },

  // ── UK ───────────────────────────────────────────────────────
  {
    id: "totaljobs",
    name: "Total Jobs",
    url: "https://www.totaljobs.com/jobs",
    category: "uk",
    description: "One of the UK's largest job boards.",
    tags: ["uk", "general"],
  },
  {
    id: "reed",
    name: "Reed",
    url: "https://www.reed.co.uk/jobs",
    category: "uk",
    description: "Major UK job board with salary checker.",
    tags: ["uk", "general", "salaries"],
  },
  {
    id: "cv-library",
    name: "CV-Library",
    url: "https://www.cv-library.co.uk/search-jobs",
    category: "uk",
    description: "UK job board with strong SME coverage.",
    tags: ["uk", "general"],
  },
  {
    id: "jobs-guardian",
    name: "Guardian Jobs",
    url: "https://jobs.theguardian.com",
    category: "uk",
    description: "Media, public sector, and NGO focused UK listings.",
    tags: ["uk", "media", "public-sector"],
  },
  {
    id: "cw-jobs",
    name: "CW Jobs",
    url: "https://www.cwjobs.co.uk/jobs",
    category: "uk",
    description: "UK tech and IT specialist board.",
    tags: ["uk", "tech", "it"],
  },

  // ── US ───────────────────────────────────────────────────────
  {
    id: "usajobs",
    name: "USAJobs",
    url: "https://www.usajobs.gov/search/results/",
    category: "us",
    description: "Official US federal government job listings.",
    tags: ["us", "government", "federal"],
  },
  {
    id: "idealist",
    name: "Idealist",
    url: "https://www.idealist.org/en/jobs",
    category: "us",
    description: "Non-profit and social impact jobs; strong in US.",
    tags: ["nonprofit", "impact", "us"],
  },

  // ── EU ───────────────────────────────────────────────────────
  {
    id: "xing",
    name: "Xing",
    url: "https://www.xing.com/jobs",
    category: "eu",
    description: "DACH region professional network and job board.",
    tags: ["germany", "austria", "switzerland", "dach"],
  },
  {
    id: "jobs-in-network",
    name: "EuropeJobs",
    url: "https://www.europejobs.com/search",
    category: "eu",
    description: "Multi-country European job aggregator.",
    tags: ["eu", "general"],
  },
];

// ── Helpers ──────────────────────────────────────────────────

export function getPortalsByCategory(category: PortalCategory): Portal[] {
  return PORTALS.filter((p) => p.category === category);
}

export function getPortalById(id: string): Portal | undefined {
  return PORTALS.find((p) => p.id === id);
}

export function searchPortals(query: string): Portal[] {
  const q = query.toLowerCase();
  return PORTALS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)) ||
      p.category.includes(q),
  );
}

export const PORTAL_CATEGORIES: Array<{ id: PortalCategory; label: string }> = [
  { id: "general",   label: "General" },
  { id: "tech",      label: "Tech" },
  { id: "startup",   label: "Startups" },
  { id: "remote",    label: "Remote" },
  { id: "executive", label: "Executive" },
  { id: "contract",  label: "Contract / Freelance" },
  { id: "fintech",   label: "Fintech" },
  { id: "design",    label: "Design" },
  { id: "data",      label: "Data & AI" },
  { id: "devops",    label: "DevOps / Platform" },
  { id: "uk",        label: "🇬🇧 UK" },
  { id: "us",        label: "🇺🇸 US" },
  { id: "eu",        label: "🇪🇺 EU" },
];
