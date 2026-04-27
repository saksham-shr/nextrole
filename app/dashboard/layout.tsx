import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/nextrole/dashboard-shell";

const ADMIN_EMAIL = "sakshamsharma614@gmail.com";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  return (
    <DashboardShell user={{ email: user.email ?? "" }} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  );
}
