"use server";

// task_runs table removed in v2 schema. This file is kept as a stub so
// any imports don't break during the transition.
export async function retryTaskRun(
  _taskRunId: string
): Promise<{ error?: string }> {
  return { error: "Task retry is no longer supported." };
}
