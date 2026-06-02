import { createClient } from "@/lib/supabase/server";
import { PipelinePageContent } from "@/components/nextrole/pipeline-page";

const PAGE_SIZES = [25, 50] as const;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const page = Math.max(1, parseInt((params.page as string) ?? "1", 10) || 1);
  const limit = (PAGE_SIZES as readonly number[]).includes(parseInt((params.limit as string) ?? "25", 10))
    ? parseInt((params.limit as string) ?? "25", 10)
    : 25;
  const sort = (params.sort as string) === "company" ? "company" : "created_at";
  const order = (params.order as string) === "asc" ? true : false; // ascending?
  const status = (params.status as string) ?? "All";
  const q = (params.q as string) ?? "";
  const error = params.error as string | undefined;
  const message = params.message as string | undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const offset = (page - 1) * limit;

  let query = supabase
    .from("jobs")
    .select("*, evaluations!evaluations_job_id_fkey(score, created_at)", { count: "exact" })
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order(sort, { ascending: order })
    .range(offset, offset + limit - 1);

  // Status filter
  if (status === "Pending") query = query.eq("status", "pending");
  else if (status === "Applied") query = query.eq("status", "applied");
  else if (status === "Interview") query = query.eq("status", "interview");
  else if (status === "Offer") query = query.eq("status", "offer");
  else if (status === "Evaluated") query = query.eq("status", "evaluated");

  // Text search
  if (q) {
    query = query.or(`title.ilike.%${q}%,company.ilike.%${q}%`);
  }

  const { data: jobs, error: jobsError, count } = await query;

  if (jobsError) console.error("[pipeline] jobs query error", jobsError.message);

  // For "All jobs" count badge and status tab counts, get counts per status
  const { data: allStatusRows } = await supabase
    .from("jobs")
    .select("status")
    .eq("user_id", user.id)
    .neq("status", "archived");

  const statusCounts = (allStatusRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalAll = allStatusRows?.length ?? 0;

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const allJobs = (jobs ?? []).map((j) => ({ title: j.title, company: j.company }));

  return (
    <PipelinePageContent
      jobs={jobs ?? []}
      existingJobs={allJobs}
      error={error}
      message={message}
      page={page}
      limit={limit}
      totalCount={totalCount}
      totalPages={totalPages}
      sort={sort}
      sortAsc={order}
      status={status}
      q={q}
      totalAll={totalAll}
      statusCounts={statusCounts}
    />
  );
}
