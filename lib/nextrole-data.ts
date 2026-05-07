export const navGroups: Array<{
  title: string;
  items: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Core",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Pipeline",  href: "/dashboard/pipeline" },
      { label: "Evaluate",  href: "/dashboard/evaluate" },
    ],
  },
  {
    title: "Documents",
    items: [
      { label: "Resumes", href: "/dashboard/resumes" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Billing",  href: "/dashboard/billing" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

export const quickActions = [
  { label: "Add Job to Pipeline",     href: "/dashboard/pipeline" },
  { label: "Evaluate Job",            href: "/dashboard/evaluate" },
  { label: "Generate Tailored Resume",href: "/dashboard/resumes" },
  { label: "Edit CV",                 href: "/dashboard/settings" },
] as const;

export const kpis: Array<{
  label: string;
  value: string;
  sublabel: string;
  tone?: "default" | "accent" | "ok" | "warn" | "bad";
}> = [
  { label: "Jobs",        value: "—", sublabel: "in your pipeline" },
  { label: "Active Apps", value: "—", sublabel: "applications in progress", tone: "accent" },
  { label: "Interviews",  value: "—", sublabel: "scheduled" },
  { label: "Avg Score",   value: "—", sublabel: "evaluated roles" },
];

const dashboardRouteInfo = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your job search at a glance.",
  },
  evaluate: {
    title: "Evaluate",
    subtitle: "Paste a URL or job description and run the full AI scoring flow.",
  },
  pipeline: {
    title: "Pipeline",
    subtitle: "Track your job applications across all stages.",
  },
  resumes: {
    title: "Resumes",
    subtitle: "Tailored resume library with PDF exports and coverage notes.",
  },
  "resumes.detail": {
    title: "Resume Detail",
    subtitle: "Review one tailored resume and its alignment to the target role.",
  },
  billing: {
    title: "Billing",
    subtitle: "Manage your plan, credits, and subscription.",
  },
  settings: {
    title: "Settings",
    subtitle: "Account preferences, security, and output defaults.",
  },
  admin: {
    title: "Admin",
    subtitle: "Platform administration.",
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
    return { key: "dashboard", href: "/dashboard", ...dashboardRouteInfo.dashboard };
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
    return { key: "unknown" as DashboardRouteKey, href: `/dashboard/${slug[0]}`, params: slug, title: "", subtitle: "" };
  }

  return { key, href: `/dashboard/${slug[0]}`, params: slug, ...info };
}

export function isKnownDashboardRoute(key: string): key is DashboardRouteKey {
  return key in dashboardRouteInfo;
}
