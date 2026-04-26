import { notFound } from "next/navigation";
import { DashboardRoutePage } from "@/components/nextrole/dashboard-pages";
import { isKnownDashboardRoute, resolveDashboardRoute } from "@/lib/nextrole-data";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const route = resolveDashboardRoute(slug ?? []);

  if (!isKnownDashboardRoute(route.key)) {
    notFound();
  }

  return <DashboardRoutePage route={route} />;
}
