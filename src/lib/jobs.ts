import type { JobListing } from "./types";

const ADZUNA_API = "https://api.adzuna.com/v1/api/jobs/in/search";
const FRESH_MAX = 3;
const AGING_MAX = 7;

function freshness(posted: string): JobListing["freshnessTag"] {
  if (!posted) return "UNKNOWN";

  let age: number | null = null;

  // ISO-8601
  try {
    const d = new Date(posted);
    if (!isNaN(d.getTime())) {
      age = Math.floor((Date.now() - d.getTime()) / 86400000);
    }
  } catch {
    // fall through
  }

  // Plain YYYY-MM-DD
  if (age === null && /^\d{4}-\d{2}-\d{2}/.test(posted)) {
    try {
      const d = new Date(posted.slice(0, 10) + "T00:00:00Z");
      if (!isNaN(d.getTime())) {
        age = Math.floor((Date.now() - d.getTime()) / 86400000);
      }
    } catch {
      // fall through
    }
  }

  if (age === null) return "UNKNOWN";

  if (age < 0) age = 0;
  if (age <= FRESH_MAX) return "FRESH";
  if (age <= AGING_MAX) return "AGING";
  return "STALE";
}

function computeFitScore(skills: string[], title: string, description: string): number {
  if (skills.length === 0) return 0;
  const text = `${title} ${description}`.toLowerCase();
  const matched = skills.filter((s) => text.includes(s.toLowerCase()));
  return Math.round((matched.length / skills.length) * 100);
}

function buildQuery(skills: string[]): string {
  const terms = skills
    .filter((s) => s.length > 1)
    .slice(0, 6);
  if (terms.length === 0) return "";
  return terms.map((t) => (/\s/.test(t) ? `"${t}"` : t)).join(" OR ");
}

async function fetchAdzuna(
  query: string,
  location: string
): Promise<Omit<JobListing, "fitScore" | "freshnessTag">[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) return [];

  try {
    const url = `${ADZUNA_API}/1`;
    const resp = await fetch(
      `${url}?${new URLSearchParams({
        app_id: appId,
        app_key: apiKey,
        what: query,
        where: location || "India",
        results_per_page: "10",
        sort_by: "date",
        max_days_old: "30",
      }).toString()}`,
      { headers: { "User-Agent": "MazaCV/1.0" }, signal: AbortSignal.timeout(8000) }
    );

    if (!resp.ok) return [];

    const data = await resp.json();
    const items: Record<string, unknown>[] = (data as { results?: Record<string, unknown>[] }).results ?? [];

    return items.map((item) => {
      const compData = (item.company as Record<string, unknown>) ?? {};
      const locData = (item.location as Record<string, unknown>) ?? {};
      const salMin = (item.salary_min as number) ?? 0;
      const salMax = (item.salary_max as number) ?? 0;
      const salaryText =
        salMin > 0 || salMax > 0
          ? `₹${formatSalary(salMin)}${salMax > salMin ? ` - ₹${formatSalary(salMax)}` : ""}`
          : "";
      const created = (item.created as string) ?? "";

      return {
        id: `adz_${(item.id as string) ?? ""}`,
        title: (item.title as string) ?? "",
        company:
          typeof compData === "object" ? ((compData as Record<string, unknown>).display_name as string) ?? "" : "",
        location:
          typeof locData === "object" ? ((locData as Record<string, unknown>).display_name as string) ?? location : location,
        salary: salaryText,
        postedAt: created,
        url: (item.redirect_url as string) ?? "",
        portal: "Adzuna" as const,
        description: ((item.description as string) ?? "").slice(0, 500),
      };
    });
  } catch {
    return [];
  }
}

async function fetchLinkedIn(
  query: string,
  location: string
): Promise<Omit<JobListing, "fitScore" | "freshnessTag">[]> {
  try {
    const params = new URLSearchParams({
      keywords: query,
      location: location || "India",
      start: "0",
      f_TPR: "r604800",
    });

    const resp = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!resp.ok) return [];

    const html = await resp.text();
    const jobs: Omit<JobListing, "fitScore" | "freshnessTag">[] = [];
    const liRegex = /<li[^>]*data-entity-urn="[^"]*:(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;
    let match: RegExpExecArray | null;

    while ((match = liRegex.exec(html)) !== null) {
      try {
        const jid = match[1];
        const block = match[2];

        const titleMatch = block.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i)
          || block.match(/<h3[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i);
        const compMatch = block.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i)
          || block.match(/<h4[^>]*class="[^"]*subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i);
        const locMatch = block.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
          || block.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        const timeEl = block.match(/<time[^>]*datetime="([^"]*)"[^>]*>/i);

        const title = titleMatch ? stripHtml(titleMatch[1]).trim() : "";
        const company = compMatch ? stripHtml(compMatch[1]).trim() : "";
        const loc = locMatch ? stripHtml(locMatch[1]).trim() : location;
        const postedAt = timeEl ? timeEl[1] : "";
        const url = `https://www.linkedin.com/jobs/view/${jid}`;

        if (!title || !jid) continue;

        jobs.push({
          id: `li_${jid}`,
          title,
          company,
          location: loc,
          salary: "",
          postedAt,
          url,
          portal: "LinkedIn",
          description: "",
        });
      } catch {
        continue;
      }
    }

    return jobs;
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function formatSalary(val: number): string {
  if (val >= 100000) return `${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
  return val.toLocaleString("en-IN");
}

export async function findJobs(
  skills: string[],
  location?: string
): Promise<JobListing[]> {
  const query = buildQuery(skills);
  if (!query) return [];

  const [adzunaJobs, linkedinJobs] = await Promise.all([
    fetchAdzuna(query, location ?? ""),
    fetchLinkedIn(query, location ?? ""),
  ]);

  const allJobs = [...adzunaJobs, ...linkedinJobs];

  const scored: JobListing[] = allJobs.map((j) => {
    const tag = freshness(j.postedAt);
    const fitScore = computeFitScore(skills, j.title, j.description);
    return { ...j, fitScore, freshnessTag: tag };
  });

  const grouped = new Map<string, JobListing[]>();
  for (const job of scored) {
    const list = grouped.get(job.portal) ?? [];
    list.push(job);
    grouped.set(job.portal, list);
  }

  const capped: JobListing[] = [];
  for (const [, jobs] of grouped) {
    jobs.sort((a, b) => b.fitScore - a.fitScore);
    capped.push(...jobs.slice(0, 3));
  }

  capped.sort((a, b) => b.fitScore - a.fitScore);
  return capped;
}
