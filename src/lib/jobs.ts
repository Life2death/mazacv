import type { JobListing } from "./types";
import { canonicalUrl, scoreJob, freshness } from "./jobScore";

const ADZUNA_API = "https://api.adzuna.com/v1/api/jobs/in/search";

// Generic terms that add noise to job search queries
const QUERY_SKIP = new Set([
  "technical", "less", "more", "other", "various", "basic", "general",
  "and", "or", "for", "the", "with", "via", "using",
]);

function buildQuery(skills: string[], jobTitles?: string[]): string {
  const titleTerms = (jobTitles ?? [])
    .filter((t) => t.length > 1)
    .slice(0, 2)
    .map((t) => (/\s/.test(t) ? `"${t}"` : t));

  // Flatten and clean skills — handles "category: value1/value2" patterns from resume extractors
  const candidates: string[] = [];
  for (const raw of skills) {
    // If category-prefixed (e.g. "agile frameworks: safe 5.0/6.0"), take right side of colon
    const payload = raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : raw;
    // Split on conjunctions and version separators
    const parts = payload.split(/[&\/]/).map((p) =>
      p.replace(/[^a-zA-Z0-9 .\-]/g, " ").replace(/\s+/g, " ").trim()
    );
    for (let p of parts) {
      // Strip trailing version numbers like "5.0", "6.0"
      p = p.replace(/\b\d+\.\d+\b/g, "").trim();
      if (p.length < 3 || p.length > 35) continue;
      if (/^\d+\.?\d*$/.test(p)) continue; // pure version string
      if (QUERY_SKIP.has(p.toLowerCase())) continue;
      candidates.push(p);
    }
  }

  // Deduplicate while preserving order, cap at 6 terms
  const seen = new Set<string>();
  const skillTerms: string[] = [];
  for (const s of candidates) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      skillTerms.push(/\s/.test(s) ? `"${s}"` : s);
    }
    if (skillTerms.length >= 6) break;
  }

  const terms = [...titleTerms, ...skillTerms];
  if (terms.length === 0) return "";
  return terms.join(" OR ");
}

interface FetchResult {
  results: (Omit<JobListing, "fitScore" | "freshnessTag" | "scoresJson"> & { salaryMin?: number })[];
  error?: string;
  statusCode?: number;
  rawCount?: number;
}

async function fetchAdzuna(
  query: string,
  location: string,
  salaryMin?: number
): Promise<FetchResult> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) return { results: [], error: "ADZUNA_APP_ID or ADZUNA_API_KEY not set" };

  try {
    const url = `${ADZUNA_API}/1`;
    const params: Record<string, string> = {
      app_id: appId,
      app_key: apiKey,
      what: query,
      where: location || "India",
      results_per_page: "10",
      sort_by: "date",
      max_days_old: "30",
    };
    if (salaryMin && salaryMin > 0) {
      params.salary_min = String(salaryMin);
    }
    const resp = await fetch(
      `${url}?${new URLSearchParams(params).toString()}`,
      { headers: { "User-Agent": "MazaCV/1.0" }, signal: AbortSignal.timeout(12000) }
    );

    if (!resp.ok) {
      let body = "";
      try { body = await resp.text(); } catch { /* ignore */ }
      return { results: [], error: `HTTP ${resp.status}: ${body.slice(0, 200)}`, statusCode: resp.status };
    }

    const data = await resp.json();
    const items: Record<string, unknown>[] = (data as { results?: Record<string, unknown>[] }).results ?? [];

    const results = items.map((item) => {
      const compData = (item.company as Record<string, unknown>) ?? {};
      const locData = (item.location as Record<string, unknown>) ?? {};
      const salMin = (item.salary_min as number) ?? 0;
      const salMax = (item.salary_max as number) ?? 0;
      const salaryText =
        salMin > 0 || salMax > 0
          ? `₹${formatSalary(salMin)}${salMax > salMin ? ` - ₹${formatSalary(salMax)}` : ""}`
          : "";
      const created = (item.created as string) ?? "";
      const jobUrl = (item.redirect_url as string) ?? "";
      const curie = `adz_${(item.id as string) ?? ""}`;

      return {
        id: curie,
        canonUrl: canonicalUrl(jobUrl) || curie,
        title: (item.title as string) ?? "",
        company:
          typeof compData === "object" ? ((compData as Record<string, unknown>).display_name as string) ?? "" : "",
        location:
          typeof locData === "object" ? ((locData as Record<string, unknown>).display_name as string) ?? location : location,
        salary: salaryText,
        postedAt: created,
        url: jobUrl,
        portal: "Adzuna" as const,
        description: ((item.description as string) ?? "").slice(0, 500),
        salaryMin: salMin || undefined,
      };
    });

    return { results, rawCount: (data as { count?: number }).count ?? results.length };
  } catch (e) {
    return { results: [], error: String(e) };
  }
}

async function fetchLinkedIn(
  query: string,
  location: string
): Promise<FetchResult> {
  const LI_TIMEOUT = 15000;
  const baseHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  async function tryFetch(url: string): Promise<FetchResult> {
    const resp = await fetch(url, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(LI_TIMEOUT),
    });
    if (!resp.ok) return { results: [], error: `HTTP ${resp.status}`, statusCode: resp.status };

    const html = await resp.text();
    const jobs: FetchResult["results"] = [];
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

        const liId = `li_${jid}`;
        jobs.push({
          id: liId,
          canonUrl: canonicalUrl(url) || liId,
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

    return { results: jobs };
  }

  try {
    const params = new URLSearchParams({
      keywords: query,
      location: location || "India",
      start: "0",
      f_TPR: "r604800",
    });

    // Try primary endpoint first
    const primaryUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
    const result = await tryFetch(primaryUrl);

    // If primary fails with 4xx/5xx, try fallback endpoint
    if (result.error && (result.statusCode ?? 0) >= 400) {
      const fallbackUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location || "India")}`;
      return await tryFetch(fallbackUrl);
    }

    return result;
  } catch (e) {
    return { results: [], error: String(e) };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function formatSalary(val: number): string {
  if (val >= 100000) return `${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
  return val.toLocaleString("en-IN");
}

export interface JobSearchDebug {
  query: string;
  location: string;
  adzunaCount: number;
  adzunaTotalMatches?: number;
  adzunaError?: string;
  linkedinCount: number;
  linkedinError?: string;
  totalBeforeFilter: number;
  totalAfterFilter: number;
  shown: number;
}

export async function findJobs(
  skills: string[],
  location?: string,
  options?: { jobTitles?: string[]; salaryMinLPA?: number; maxFreshnessDays?: number }
): Promise<{ jobs: JobListing[]; debug: JobSearchDebug }> {
  const query = buildQuery(skills, options?.jobTitles);
  const loc = location ?? "";

  if (!query) {
    return {
      jobs: [],
      debug: { query: "", location: loc, adzunaCount: 0, linkedinCount: 0, totalBeforeFilter: 0, totalAfterFilter: 0, shown: 0, adzunaError: "Empty query — no skills or titles provided" },
    };
  }

  const salaryMin = options?.salaryMinLPA && options.salaryMinLPA > 0
    ? options.salaryMinLPA * 100000
    : undefined;

  const [adzunaResult, linkedinResult] = await Promise.all([
    fetchAdzuna(query, loc, salaryMin),
    fetchLinkedIn(query, loc),
  ]);

  const allJobs = [...adzunaResult.results, ...linkedinResult.results];
  const totalBeforeFilter = allJobs.length;

  let scored: JobListing[] = allJobs.map((j) => {
    const fresh = freshness(j.postedAt);
    const sr = scoreJob({
      title: j.title,
      company: j.company,
      description: j.description,
      salaryMin: j.salaryMin ?? 0,
      location: j.location,
    });
    const fitScore = Math.max(0, sr.total + fresh.penalty);
    return { ...j, fitScore, freshnessTag: fresh.tag, scoresJson: sr.breakdown as unknown as Record<string, number> };
  });

  if (options?.maxFreshnessDays) {
    const limit = options.maxFreshnessDays;
    scored = scored.filter((j) => {
      const fresh = freshness(j.postedAt);
      if (fresh.ageDays === null) return true;
      return fresh.ageDays <= limit;
    });
  }

  const totalAfterFilter = scored.length;

  // Dedup by canonUrl — keep highest fitScore
  const canonMap = new Map<string, JobListing>();
  for (const job of scored) {
    const existing = canonMap.get(job.canonUrl);
    if (!existing || job.fitScore > existing.fitScore) {
      canonMap.set(job.canonUrl, job);
    }
  }
  scored = Array.from(canonMap.values());

  const grouped = new Map<string, JobListing[]>();
  for (const job of scored) {
    const list = grouped.get(job.portal) ?? [];
    list.push(job);
    grouped.set(job.portal, list);
  }

  const capped: JobListing[] = [];
  for (const [, jobs] of grouped) {
    jobs.sort((a, b) => b.fitScore - a.fitScore);
    capped.push(...jobs.slice(0, 5));
  }

  capped.sort((a, b) => b.fitScore - a.fitScore);

  return {
    jobs: capped,
    debug: {
      query,
      location: loc || "India (default)",
      adzunaCount: adzunaResult.results.length,
      adzunaTotalMatches: adzunaResult.rawCount,
      adzunaError: adzunaResult.error,
      linkedinCount: linkedinResult.results.length,
      linkedinError: linkedinResult.error,
      totalBeforeFilter,
      totalAfterFilter,
      shown: capped.length,
    },
  };
}
