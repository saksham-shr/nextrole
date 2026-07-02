export const navGroups: Array<{
  title: string;
  items: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Pipeline",  href: "/dashboard/pipeline" },
      { label: "Evaluate",  href: "/dashboard/evaluate" },
      { label: "Explore",   href: "/dashboard/explore" },
    ],
  },
  {
    title: "Profile & Documents",
    items: [
      { label: "Profile", href: "/dashboard/profile" },
      { label: "Resumes", href: "/dashboard/resumes" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings",          href: "/dashboard/settings" },
      { label: "Billing",           href: "/dashboard/billing" },
      { label: "Connect Extension", href: "/connect-extension" },
    ],
  },
];

// Admin group is appended by DashboardShell only when the user is an admin:
//   { title: "Admin", items: [{ label: "Admin", href: "/dashboard/admin" }] }

export const quickActions = [
  { label: "Add Job to Pipeline",      href: "/dashboard/pipeline" },
  { label: "Evaluate a Job",           href: "/dashboard/evaluate" },
  { label: "Generate Tailored Resume", href: "/dashboard/resumes" },
  { label: "Edit Profile / CV",        href: "/dashboard/profile" },
  { label: "Connect Browser Support",  href: "/connect-extension" },
] as const;


const dashboardRouteInfo = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your job search at a glance — and your next best step.",
  },
  evaluate: {
    title: "Evaluate",
    subtitle: "Paste a job URL or description to score fit, surface gaps, and decide your next move.",
  },
  pipeline: {
    title: "Pipeline",
    subtitle: "Track every opportunity across Saved, Evaluated, Applied, Interview, and Offer.",
  },
  explore: {
    title: "Explore",
    subtitle: "Browse roles matched to your profile and add the promising ones to your pipeline.",
  },
  resumes: {
    title: "Resumes",
    subtitle: "Your tailored resume library, with coverage notes and exports.",
  },
  "resumes.detail": {
    title: "Resume Detail",
    subtitle: "Review one tailored resume and how well it aligns to the target role.",
  },
  profile: {
    title: "Profile",
    subtitle: "Your CV and preferences power evaluations, tailoring, and autofill answers.",
  },
  billing: {
    title: "Plan & Credits",
    subtitle: "Manage your plan, credits, usage, and referrals.",
  },
  settings: {
    title: "Settings",
    subtitle: "Account, security, connected browser support, and output defaults.",
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
