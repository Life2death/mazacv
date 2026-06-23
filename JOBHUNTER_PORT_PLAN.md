# Job-Hunter → MazaCV — Logic Port Plan (gap analysis)

> **Date:** 2026-06-23
> **Author:** review of latest `master` (`aeceb98`) against `Life2death/job-hunter`.
> **Purpose:** This supersedes the optimistic build-order in `JOBS_PLATFORM_PLAN.md`
> by recording **what actually shipped** vs **what the plan assumed**, and defining
> the real remaining work to bring job-hunter's intelligence into MazaCV.
>
> **Status: APPROVED — Path A selected (2026-06-23).** Implement Section 4 steps.
> Path B (full Supabase + Python scraper + GitHub Action) is deferred to a later phase.

---

## 1. What actually shipped (current `/dashboard`)

The merged dashboard is a **client-side MVP**, not the Supabase-backed pipeline the
plan described:

| Area | Plan said | Reality on `master` |
|---|---|---|
| Storage | Supabase `job_listings` + `search_config` | **`localStorage`** (`mazacv_job_results`, `mazacv_job_settings`) |
| API | `/api/jobboard/{jobs,config,refresh}` | None — only the live `POST /api/jobs` search |
| Portals | LinkedIn, Adzuna, Foundit, IIMJobs, Naukri | **Adzuna + LinkedIn only** (`src/lib/jobs.ts`) |
| Scoring | job-hunter rubric (`score_job`) | **Naive keyword overlap** (`matched/total × 100`) |
| Scraper | Python `scraper/` pkg + GitHub Action | None |
| Rapid Apply | one-at-a-time deck w/ keyboard A/S/N | **Empty stub** (`ApplyTab`) |
| Queue | port of scraper HTML report | ✅ built (cards, applied-tracking, dedup by `canonUrl`) |

**Implication:** none of job-hunter's actual *intelligence* (scoring, the cookie
portals, freshness rubric, company tiers) is in MazaCV yet. The dashboard is a
working shell around a 2-portal live search.

---

## 2. The logic worth porting from job-hunter

From `multi_portal_job_hunter.py` + `settings.json` + `dedup.py`:

1. **Scoring rubric** — `score_job(job, track)`: role/level match, SAFe-or-governance-or-scope
   signal, BFSI domain fit, compensation vs floor/target, location tiers, org quality
   (company tiers), availability; minus negative-keyword penalty; minus AGING penalty.
   This is **profile-fit** scoring (does the job suit the candidate) — distinct from
   MazaCV's ATS resume-vs-JD score. Surface it as the queue's **Fit** badge.
2. **Keyword/constant sets** — `SAFE_KEYWORDS`, `BFSI_KEYWORDS`, `GOVERNANCE_KW`,
   `SCOPE_KW`, `NEGATIVE_KW`, `TIER1_BFSI`/`GCC_FINTECH`/`IT_SERVICES`, location prefs,
   comp floors. All already JSON in `settings.json` → trivially portable to TS.
3. **Freshness** — `freshness()` handling relative strings ("3 Days Ago", "30+ Days Ago")
   and absolute dates. MazaCV's `ageDays()` only handles ISO/`YYYY-MM-DD`; the relative
   forms (common on Naukri/Foundit) are unhandled.
4. **Dedup identity** — `canonical_url()` (lowercase host, strip `www.`, drop query/fragment,
   trailing slash). MazaCV currently dedups by `canonUrl` but sets `canonUrl = id` (no real
   URL canonicalisation). Porting `canonical_url()` gives cross-run stable identity.
5. **The 3 cookie portals** — `fetch_naukri` (RSA `nkparam`), `fetch_foundit`, `fetch_iimjobs`.
   Need logged-in session cookies; impractical on Vercel serverless (needs `curl_cffi`,
   forced IPv4, long runs) → belongs in a Python GitHub Action, per the plan.

---

## 3. Two honest paths (Path A approved)

### Path A — Port scoring only, stay client-side (small, fast) ✅ SELECTED
Bring the **scoring rubric + constants + freshness + canonical_url** into TS
(`src/lib/jobScore.ts`), applied to the existing Adzuna+LinkedIn results. No DB, no
scraper, no new portals. Upgrades the Fit badge from naive overlap to the real rubric.
- **Pros:** days not weeks; no secrets, no infra; immediately better ranking.
- **Cons:** still 2 portals; still localStorage (no cross-device, Rapid Apply stays thin).

### Path B — Full pipeline (deferred)
Supabase `job_listings`/`search_config` + `/api/jobboard/*` + Python `scraper/` package
(all 5 portals, real `score_job`) + GitHub Action triggered by a Refresh button.
- **Pros:** real product — persistent, multi-portal, server-scored, Rapid Apply works.
- **Cons:** weeks; needs Adzuna keys, a GH dispatch PAT, Supabase schema migration, and
  ongoing cookie maintenance for Naukri/Foundit/IIMJobs (403 when stale).

**Decision:** **Path A now** (port the scoring brain — highest value per effort, zero
infra), then **Path B incrementally** starting with the Supabase read/write path so the
queue survives across devices, then the scraper, then cookie portals last.

---

## 4. Path A — concrete implementation steps

> Reference source: `Life2death/job-hunter` → `multi_portal_job_hunter.py`
> (`score_job`, `company_tier`, `location_score`, `comp_score`, `freshness`,
> `has_kw`, `count_kw`) and `settings.json` (all constant sets), `dedup.py`
> (`canonical_url`).

1. **`src/lib/jobScore.ts` (new)** — port, as typed TS constants + functions:
   - All `settings.json` keyword sets: `SAFE_KEYWORDS`, `BFSI_KEYWORDS`, `GOVERNANCE_KW`,
     `SCOPE_KW`, `SENIOR_PM_KW`, `NEGATIVE_KW`.
   - Company tiers: `TIER1_BFSI`, `GCC_FINTECH`, `IT_SERVICES` → `companyTier(company)`.
   - Location prefs → `locationScore(loc)`.
   - Comp floors/targets → `compScore(salary, track)`.
   - `freshness(posted)` — extend MazaCV's `ageDays()` to also parse relative strings
     ("N Day(s) Ago", "Today", "Just now", "30+ Days Ago").
   - `scoreJob(job, track)` — the weighted rubric returning `{ total, breakdown }`,
     including the AGING penalty and negative-keyword penalty.
2. **Track support** — add a `track` value (default `"PM"`, since v1 = PM) so the rubric
   picks the right role-match keyword bank. Derive from settings or hardcode `PM` for now.
3. **Swap the scorer** — in `src/lib/jobs.ts`, replace `computeFitScore()` with
   `scoreJob().total`. **Keep the `fitScore` field name** so `dashboard/page.tsx`,
   `JobsSection.tsx`, and the localStorage shape need no change.
4. **Real dedup identity** — port `canonical_url()` into `jobScore.ts` (or a small
   `src/lib/canonUrl.ts`); set `canonUrl = canonicalUrl(url)` in `fetchAdzuna`/`fetchLinkedIn`
   instead of `canonUrl = id`. Keep the existing canon-map dedup in `findJobs()`.
5. **Optional:** store the score breakdown (`scores_json` equivalent) on the job object so a
   future job-detail view can show *why* a job scored as it did. Not required for v1.
6. **Verify** — `npm run build` green; run a real search and sanity-check that senior
   BFSI/SAFe roles rank above junior/irrelevant ones; negative-keyword roles sink.

**Acceptance:** Fit badge reflects the real rubric (not keyword overlap); ordering is
visibly better; no UI/route/storage-shape changes; build passes.

**Out of scope for Path A:** Supabase, `/api/jobboard/*`, Python scraper, GitHub Action,
the 3 cookie portals, Rapid Apply implementation. (All Path B.)

---

## 5. What I need from you (only when we start Path B)
- `ADZUNA_APP_ID` + `ADZUNA_API_KEY` (already used by `/api/jobs` — confirm they're in Vercel).
- A fine-grained GitHub PAT (Actions: write on `Life2death/mazacv`) for the Refresh dispatch.
- Go-ahead to run the `job_listings`/`search_config` schema against MazaCV's Supabase.
- *Cookie portals (last):* fresh `NAUKRI_COOKIE`, `FOUNDIT_COOKIE`, `IIMJOBS_COOKIE`.

## 6. Guardrails (unchanged)
- MazaCV's ATS scorer stays the resume-vs-JD scorer; ported `fit` is only a job-match badge.
- `scraper/` (Path B) must be self-contained — no import of the external job-hunter repo.
- Zero-config: missing keys → graceful empty state, never crash.
- No slang in any exported resume (Hinglish UI copy is fine).
