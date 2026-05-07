"use client";

import {
  Button,
  EmptyState,
  InputField,
  MiniMetric,
  SectionTitle,
  StatCard,
  Surface,
  Timeline,
} from "@/components/nextrole/ui";
import type { DashboardRoute } from "@/lib/nextrole-data";
import { quickActions, kpis } from "@/lib/nextrole-data";

function DashboardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono-stack)" }}>
          NextRole workspace
        </p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickActions.slice(0, 2).map((action, index) => (
          <Button key={action.href} href={action.href} tone={index === 0 ? "accent" : "default"}>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} sublabel={kpi.sublabel} tone={kpi.tone} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Surface className="p-5">
          <SectionTitle title="Quick actions" subtitle="Get started with your job search" />
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action, index) => (
              <Button key={action.href} href={action.href} tone={index === 0 ? "accent" : "default"} className="justify-start">
                {action.label}
              </Button>
            ))}
          </div>
        </Surface>

        <Surface tone="accent" className="p-5">
          <SectionTitle title="Get started" subtitle="Complete these steps to set up NextRole" />
          <Timeline
            items={[
              { title: "Add your CV", subtitle: "Upload your base CV in the CV section" },
              { title: "Set up your profile", subtitle: "Configure your target roles and compensation" },
              { title: "Add a job", subtitle: "Add a job to your pipeline or evaluate one" },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}


function ProfilePage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Surface className="p-5">
        <SectionTitle title="Targeting profile" subtitle="Role families, geographies, compensation, and exclusions" />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Target role families" placeholder="Platform, product eng, staff IC" />
          <InputField label="Role exclusions" placeholder="Pure EM, agency-heavy roles" />
          <InputField label="Geography" placeholder="US remote, NYC, EU optional" />
          <InputField label="Work preference" placeholder="Remote, hybrid, occasional onsite" />
          <InputField label="Compensation target" placeholder="$220k+ total comp" />
          <InputField label="Industry targets" placeholder="Developer tools, fintech infra, product-led SaaS" />
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="System impact" subtitle="How profile choices affect the rest of the product" />
        <div className="grid gap-4">
          {[
            "Evaluation weighting and scoring",
            "Resume tailoring keyword emphasis",
          ].map((item) => (
            <MiniMetric key={item} label="Used by" value={item} />
          ))}
        </div>
      </Surface>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Surface className="p-5">
        <SectionTitle title="Account and defaults" subtitle="Security, notifications, language, and output preferences" />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Display name" placeholder="Jane Candidate" />
          <InputField label="Email" placeholder="jane@example.com" />
          <InputField label="Default language" placeholder="English" />
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Account actions" subtitle="Export, security, and deletion controls" />
        <div className="grid gap-3">
          {["Change password", "Export account data", "Delete account"].map((action, index) => (
            <Button key={action} tone={index === 2 ? "bad" : "default"} className="justify-start">
              {action}
            </Button>
          ))}
        </div>
      </Surface>
    </div>
  );
}

export function DashboardRoutePage({ route }: { route: DashboardRoute }) {
  return (
    <div className="space-y-6">
      <DashboardHeader title={route.title} subtitle={route.subtitle} />
      {renderRoute(route)}
    </div>
  );
}

function renderRoute(route: DashboardRoute) {
  switch (route.key) {
    case "dashboard":
      return <DashboardOverview />;
    case "profile":
      return <ProfilePage />;
    case "settings":
      return <SettingsPage />;
    default:
      return (
        <EmptyState
          title="Page not found"
          body="This route does not exist."
        />
      );
  }
}
