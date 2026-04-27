"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const TASK_ROUTES: Partial<Record<string, string>> = {
  evaluate: "/api/evaluate",
  compare: "/api/compare",
  batch: "/api/batch",
  scan: "/api/scan",
  interview_prep: "/api/interview-prep",
  followup: "/api/followup",
  deep_research: "/api/deep",
  apply: "/api/apply",
  contact_draft: "/api/contact",
  training_eval: "/api/training",
  project_eval: "/api/project",
  negotiate: "/api/negotiate",
};

export async function retryTaskRun(
  taskRunId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: run, error: fetchError } = await supabase
    .from("task_runs")
    .select("*")
    .eq("id", taskRunId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !run) return { error: "Task run not found" };
  if (run.status !== "failed") return { error: "Only failed runs can be retried" };
  if (!run.input) return { error: "No input stored for this run" };

  const route = TASK_ROUTES[run.type];
  if (!route) return { error: `Task type "${run.type}" cannot be retried` };

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  const res = await fetch(`${protocol}://${host}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: hdrs.get("cookie") ?? "",
    },
    body: JSON.stringify(run.input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    return { error: text.slice(0, 200) };
  }

  revalidatePath("/dashboard/activity");
  return {};
}
