import type { JobListing } from "./types";

// ─── Config ─────────────────────────────────────────────────────────────────

export interface ScrapeConfig {
  jobTitles: string;
  keywords: string;
  locations: string;
  salaryMinLpa: number;
  maxFreshnessDays: number;
  track: string;
  enabled: boolean;
}

export interface PipelineRun {
  id: string;
  userId: string;
  status: "queued" | "running" | "done" | "error";
  portals: string[];
  jobsFound: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface JobFilters {
  portal?: string;
  status?: string;
  minFit?: number;
  freshness?: string;
  q?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function configured(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function sb() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function listJobs(
  userId: string,
  filters?: JobFilters
): Promise<JobListing[]> {
  if (!configured()) return [];

  const client = await sb();
  let query = client
    .from("job_listings")
    .select("*")
    .eq("user_id", userId)
    .order("fit", { ascending: false });

  if (filters?.portal) query = query.eq("portal", filters.portal);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.freshness) query = query.eq("freshness", filters.freshness);
  if (filters?.minFit) query = query.gte("fit", filters.minFit);
  if (filters?.q) {
    query = query.or(
      `title.ilike.%${filters.q}%,company.ilike.%${filters.q}%`
    );
  }

  const { data } = await query.limit(100);
  return mapRows(data ?? []);
}

export async function updateJobStatus(
  jobId: string,
  userId: string,
  status: string
): Promise<void> {
  if (!configured()) return;

  const client = await sb();
  await client
    .from("job_listings")
    .update({
      status,
      applied_date: status === "applied" ? new Date().toISOString().slice(0, 10) : undefined,
    })
    .eq("job_id", jobId)
    .eq("user_id", userId);
}

export async function upsertJobs(
  jobs: JobListing[],
  userId: string,
  track: string
): Promise<void> {
  if (!configured()) return;
  if (jobs.length === 0) return;

  const client = await sb();
  const rows = jobs.map((j) => ({
    job_id: j.id,
    user_id: userId,
    track,
    portal: j.portal,
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary,
    posted: j.postedAt,
    url: j.url,
    canon_url: j.canonUrl,
    fit: j.fitScore,
    freshness: j.freshnessTag,
    scores_json: j.scoresJson ?? null,
    description: j.description,
    last_seen_date: new Date().toISOString().slice(0, 10),
  }));

  // Batch upsert in chunks of 50
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    await client.from("job_listings").upsert(chunk, {
      onConflict: "job_id",
      ignoreDuplicates: false,
    });
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getConfig(userId: string): Promise<ScrapeConfig | null> {
  if (!configured()) return null;

  const client = await sb();
  const { data } = await client
    .from("search_config")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    jobTitles: data.job_titles ?? "",
    keywords: data.keywords ?? "",
    locations: data.locations ?? "",
    salaryMinLpa: data.salary_min_lpa ?? 0,
    maxFreshnessDays: data.max_freshness_days ?? 0,
    track: data.track ?? "PM",
    enabled: data.enabled ?? true,
  };
}

export async function saveConfig(
  userId: string,
  email: string,
  config: Partial<ScrapeConfig>
): Promise<void> {
  if (!configured()) return;

  const client = await sb();
  await client.from("search_config").upsert(
    {
      user_id: userId,
      email,
      job_titles: config.jobTitles,
      keywords: config.keywords,
      locations: config.locations,
      salary_min_lpa: config.salaryMinLpa,
      max_freshness_days: config.maxFreshnessDays,
      track: config.track,
      enabled: config.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// ─── Pipeline runs ──────────────────────────────────────────────────────────

export async function getLatestRun(
  userId: string
): Promise<PipelineRun | null> {
  if (!configured()) return null;

  const client = await sb();
  const { data } = await client
    .from("pipeline_runs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    status: data.status,
    portals: data.portals ?? [],
    jobsFound: data.jobs_found ?? 0,
    error: data.error,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
  };
}

export async function insertRun(
  userId: string,
  portals: string[]
): Promise<string | null> {
  if (!configured()) return null;

  const client = await sb();
  const { data, error } = await client
    .from("pipeline_runs")
    .insert({
      user_id: userId,
      status: "queued",
      portals,
      jobs_found: 0,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data.id;
}

// ─── Quota gate (inert until PIPELINE_QUOTA_ENABLED) ────────────────────────

const QUOTA_ENABLED = process.env.PIPELINE_QUOTA_ENABLED === "true";

export interface QuotaResult {
  allowed: boolean;
  reason?: string;
}

export function checkPipelineQuota(_userId: string): QuotaResult {
  if (!QUOTA_ENABLED) return { allowed: true };
  // TODO(payments): gate pipeline runs once tiers are decided
  return { allowed: true };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function mapRows(rows: Record<string, unknown>[]): JobListing[] {
  return rows.map((r) => ({
    id: (r.job_id as string) ?? "",
    canonUrl: (r.canon_url as string) ?? "",
    title: (r.title as string) ?? "",
    company: (r.company as string) ?? "",
    location: (r.location as string) ?? "",
    salary: (r.salary as string) ?? "",
    postedAt: (r.posted as string) ?? "",
    url: (r.url as string) ?? "",
    portal: (r.portal as "Adzuna" | "LinkedIn") ?? "Adzuna",
    description: (r.description as string) ?? "",
    fitScore: (r.fit as number) ?? 0,
    freshnessTag: (r.freshness as JobListing["freshnessTag"]) ?? "UNKNOWN",
    scoresJson: (r.scores_json as Record<string, number>) ?? undefined,
  }));
}
