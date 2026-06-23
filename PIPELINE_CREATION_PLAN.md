# Pipeline Creation — Build Plan (for the coding agent)

> **Date:** 2026-06-23
> **Depends on:** `JOBHUNTER_PORT_PLAN.md` (Path A scoring already shipped in
> `src/lib/jobScore.ts`). This doc is **Path B** — the server-side, multi-portal
> "Execute Pipeline" feature.
> **Status: PLANNING — build to this spec.** Monetization is **OUT for now**
> (Section 9) — build the structure, leave it inert, activate later.

---

## 1. Goal (one sentence)

Let a logged-in user save their job-search preferences once, press **one button
("Fresh jobs leke aao 🔄")**, which triggers a GitHub-Actions pipeline that scrapes
all portals (incl. the cookie ones job-hunter supports), scores them with the
already-ported rubric, writes results to MazaCV's Supabase, and shows them in the
Jobs Queue — with a live "jobs nikal rahe hai…" banner while it runs.

**No separate "Create pipeline" button.** Saving preferences *is* creating the
pipeline. There is exactly **one** action button: the trigger.

---

## 2. Portals — what's live vs what this unlocks

| Portal | Today (Path A, client-side) | After this pipeline |
|---|---|---|
| Adzuna | ✅ live, instant | ✅ |
| LinkedIn | ✅ live (guest scrape; may 429 from Vercel IPs) | ✅ (server-side, more reliable) |
| Naukri | ❌ | ✅ (needs `NAUKRI_COOKIE` + RSA `nkparam`) |
| Foundit | ❌ | ✅ (needs `FOUNDIT_COOKIE`) |
| IIMJobs | ❌ | ✅ (needs `IIMJOBS_COOKIE`) |

Keep the existing **instant client-side Adzuna+LinkedIn search** as the free,
always-on path. The pipeline is the *richer* 5-portal path. Both write to the same
Queue (localStorage today; Supabase after this — see Section 4).

---

## 3. The button flow (async — the run is ~1–3 min, NOT instant)

```
[Dashboard → Settings tab]
  user edits preferences → autosaves to Supabase search_config (debounced)
  (optional explicit "Save preferences" button; not required)

[Settings tab → "Fresh jobs leke aao 🔄" button]
  → POST /api/jobboard/refresh
      • server checks quota gate (Section 9 — currently a no-op pass-through)
      • inserts pipeline_runs row (status='queued')
      • fires GitHub repository_dispatch (event_type='scrape-request', payload={email, runId})
      • returns 202 immediately
  → client redirects to /dashboard?tab=queue

[Queue tab]
  • shows banner: "Jobs nikal rahe hai… ⏳ (~2 min)"  ← initiated by the trigger
  • polls GET /api/jobboard/run-status?runId=  every ~10s
      (or polls GET /api/jobboard/jobs and diffs the count)
  • when run row flips to status='done' (or new rows appear) → banner clears,
    table refreshes, toast "X nayi jobs mili 🎉"
  • on status='error' / timeout (>5 min) → banner shows "Pipeline mein dikkat —
    dobara try karo", keep any rows that did land
```

**Banner is owned by the Queue tab**, keyed off run status — not a fire-and-forget
alert. Partial success is normal (a cookie portal can 403) → show whatever
succeeded, never all-or-nothing.

---

## 4. Supabase schema (MazaCV's existing project — new tables only)

```sql
-- Scraped, scored jobs (replaces localStorage as the Queue's source of truth)
create table if not exists job_listings (
  job_id        text primary key,           -- "li_123" / "adz_abc" / "nk_999"
  user_id       uuid references auth.users(id) on delete cascade,
  track         text default 'PM',
  portal        text not null,              -- Adzuna/LinkedIn/Naukri/Foundit/IIMJobs
  title         text not null,
  company       text not null,
  location      text,
  salary        text,
  posted        text,
  url           text,
  canon_url     text,                       -- dedup identity (jobScore.canonicalUrl)
  fit           integer default 0,          -- jobScore total + freshness penalty, clamped >=0
  freshness     text,                       -- FRESH / AGING / STALE / UNKNOWN
  scores_json   jsonb,                       -- score breakdown
  description   text,                        -- FULL JD (for "Score against this job")
  status        text default 'not_applied', -- not_applied / applied / skipped / not_interested
  imported_date date not null default current_date,
  applied_date  date,
  last_seen_date date
);
create index if not exists idx_jl_user on job_listings(user_id);
create index if not exists idx_jl_fit  on job_listings(fit desc);
create index if not exists idx_jl_canon on job_listings(canon_url);

-- One config row per user (the "pipeline")
create table if not exists search_config (
  user_id    uuid references auth.users(id) on delete cascade primary key,
  email      text,
  track      text default 'PM',
  keywords   text,        -- comma-separated
  job_titles text,        -- comma-separated
  locations  text,        -- comma-separated CSV
  salary_min_lpa integer,
  max_freshness_days integer,
  enabled    boolean default true,
  updated_at timestamptz default now()
);

-- Run log (drives the banner + quota later)
create table if not exists pipeline_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  status      text default 'queued',   -- queued / running / done / error
  portals     text[],                  -- which portals were attempted
  jobs_found  integer default 0,
  error       text,
  started_at  timestamptz default now(),
  finished_at timestamptz
);
create index if not exists idx_runs_user on pipeline_runs(user_id, started_at desc);

alter table job_listings enable row level security;
alter table search_config enable row level security;
alter table pipeline_runs enable row level security;
create policy "own jobs"   on job_listings  for select using (auth.uid() = user_id);
create policy "own config" on search_config for all    using (auth.uid() = user_id);
create policy "own runs"   on pipeline_runs for select using (auth.uid() = user_id);
-- The Action writes with the service-role key (bypasses RLS); app reads server-side.
```

**Migration note:** the Queue today reads `localStorage` (`mazacv_job_results`).
After this, the Queue reads `job_listings` server-side (like `/api/scans`). Keep a
one-time localStorage→nothing transition (just stop using it); no user data loss
since these are ephemeral search results.

---

## 5. App changes (Next.js)

- **`src/lib/jobboard.ts` (new)** — service-role Supabase reads/writes:
  `listJobs(userId, filters)`, `updateJobStatus`, `getConfig`, `saveConfig`,
  `getLatestRun(userId)`, `triggerScrape(email, runId)`. Zero-config: missing
  env/tables → empty list, never crash.
- **API routes (auth-gated):**
  | Route | Method | Action |
  |---|---|---|
  | `/api/jobboard/jobs` | GET | list user's jobs (filters: portal, status, minFit, freshness, q) |
  | `/api/jobboard/jobs/[id]` | PATCH | update one job's status |
  | `/api/jobboard/config` | GET/PUT | read/upsert search_config |
  | `/api/jobboard/refresh` | POST | quota gate → insert run → repository_dispatch → 202 |
  | `/api/jobboard/run-status` | GET | latest run status for polling |
- **Settings tab** — point the existing `PMSettingsForm` autosave at
  `/api/jobboard/config` (keep localStorage as offline fallback). Add the
  **"Fresh jobs leke aao 🔄"** button → `/api/jobboard/refresh` → redirect to Queue.
- **Queue tab** — read from `/api/jobboard/jobs`; add the banner + polling
  (Section 3); add Min-Fit (default 40) + Portal + Freshness filters (Section 7).

---

## 6. Scraper package (Python, self-contained — `scraper/`)

Copy + de-couple from `Life2death/job-hunter` (no external import):
```
scraper/
  run.py            # argparse(--email,--track,--portals); reads search_config; loops portals; scores; upserts
  portals.py        # fetch_linkedin/adzuna/foundit/iimjobs/naukri  (copied)
  score.py          # score_job, freshness, location_score, comp_score, company_tier (mirror src/lib/jobScore.ts)
  config.py         # keyword sets, comp floors, location maps (from settings.json)
  dedup.py          # canonical_url()
  store.py          # NEW: read search_config + UPSERT job_listings + update pipeline_runs (Supabase REST, service role)
  requirements.txt  # requests, curl_cffi, beautifulsoup4, lxml, pycryptodome
```
- `run.py` reads the user's `search_config` by email, builds the search list, scrapes
  the requested portals (default: all enabled with cookies present; skip a portal whose
  cookie is missing rather than failing the run), scores, dedups by `canonical_url`,
  **stores the FULL description**, UPSERTs into `job_listings`, and updates the
  `pipeline_runs` row to `done` (or `error`) with `jobs_found`.
- Keep the score logic **identical** to `src/lib/jobScore.ts` so the badge means the
  same thing whether a row came from the instant search or the pipeline.

---

## 7. Display / cutoff logic (decided)

- **Store** all rows with `fit > 0` (i.e. drop only STALE/zero). Never discard fetched data.
- **Display default:** sort `fit desc`; default **Min-Fit filter = 40** (user-adjustable).
- **Color tiers:** ≥60 green (strong) · 40–59 amber (decent) · <40 grey (weak).
- **Per-run cap:** store at most ~100 rows per run; paginate the table.
- **Rationale:** the ported rubric is harsh on thin-description / unknown-comp portals
  (Adzuna/LinkedIn), so a hard 50 cutoff would hide legitimate roles. Show all, strongest
  first, hide only obvious junk (<40) by default.

---

## 7B. Fit-score explainer — show the user HOW scoring works

**Requirement:** the user must be able to see *why* a job scored what it did. Add a
**collapsible "Fit score kaise nikalta hai? ℹ️" panel at the bottom of the search-jobs
page** (the Settings/`PMSettingsForm` screen, below `<JobsSection>`), and the same panel
on the Queue tab. Collapsed by default; expands to the breakdown below.

**Key message to the user (microcopy):** *"Fit score job ki aapke profile se match
batata hai — job ke title, company, location, salary aur JD se nikaala jaata hai. Zyada
score = behtar match."* (i.e. the score describes the **job**, computed from the posting.)

**Factor table to render (mirror `src/lib/jobScore.ts`):**

| Factor | Max | Kis se nikalta hai (source) |
|---|---|---|
| Role match | 25 (PM 23) | Job **title** — senior/TPM titles score highest |
| Governance / SAFe / Scope | 20 | Keyword count in the **JD text** |
| Domain fit (BFSI) | 15 | Banking/fintech keywords in **JD + company** |
| Compensation | 18 | **Salary listed** on the posting (unknown → 8) |
| Location | 10 | Job **location** (Mumbai/Pune 10, remote 8) |
| Org quality | 10 | **Company** vs tier list (tier-1 BFSI 10) |
| Freshness penalty | −10 / −100 | AGING (−10) or STALE (−100); FRESH = 0 |

- **Per-job breakdown:** each job card already carries `scores_json` — expose it via an
  expandable "score breakdown" on the card (or a tooltip) so the user sees the actual
  per-factor points for *that* job, not just the generic table.
- **Color legend:** ≥60 green (strong) · 40–59 amber (decent) · <40 grey (weak).
- **Note (optional display tweak):** the rubric maxes ~98, not 100 — it's a relative
  ranking scale, not a percentage. If a 0–100 feel is wanted, normalize for display only
  (`round(fit / 98 * 100)`); does NOT change ranking. Leave raw unless product decides.

**Acceptance:** user can open a panel on the search-jobs page (and Queue) that explains
the six factors + freshness penalty + color tiers; per-job `scores_json` breakdown is
viewable on the card. No change to the scoring logic itself.

## 8. GitHub Action (`.github/workflows/scrape.yml`, this repo)

```yaml
on:
  repository_dispatch: { types: [scrape-request] }   # per-user button
  schedule: [{ cron: "30 1 * * *" }]                  # daily 07:00 IST batch for all enabled users
  workflow_dispatch: {}
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r scraper/requirements.txt
      - run: python -m scraper.run --email "${EMAIL}" --track PM
        env:
          EMAIL: ${{ github.event.client_payload.email }}
          RUN_ID: ${{ github.event.client_payload.runId }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ADZUNA_APP_ID: ${{ secrets.ADZUNA_APP_ID }}
          ADZUNA_API_KEY: ${{ secrets.ADZUNA_API_KEY }}
          NAUKRI_COOKIE: ${{ secrets.NAUKRI_COOKIE }}
          FOUNDIT_COOKIE: ${{ secrets.FOUNDIT_COOKIE }}
          IIMJOBS_COOKIE: ${{ secrets.IIMJOBS_COOKIE }}
```

**Cost strategy (no account hacks):**
- Make the scraper repo (or this repo) **public** → Actions standard runners are
  **unlimited & free**. Secrets stay private even in a public repo.
- The **scheduled daily run batches ALL enabled users in one run** (loop
  `search_config`), so 100 users = 1 run, not 100.
- `repository_dispatch` (the button) is the only per-user run — that's what the
  daily-quota gate (Section 9) will throttle later.
- Do **not** create per-user GitHub accounts (violates GitHub ToS / free-tier
  circumvention; risks the main account). One account — yours.

**Trigger token:** Vercel env `GH_DISPATCH_TOKEN` (fine-grained PAT, Actions:write on
this repo). Unset → `/api/jobboard/refresh` returns a friendly "pipeline not configured".

---

## 9. Payments / quota — DEFERRED (build inert, activate later)

> **Decision: monetization is NOT decided yet. Build the hooks, leave them OFF.**
> Everything below must exist in code but be a **pass-through no-op** until a single
> flag is flipped. No Razorpay calls, no paywalls, no limits enforced now.

- **Feature flag:** `PIPELINE_QUOTA_ENABLED` (env, default `false`). When `false`,
  `/api/jobboard/refresh` skips all quota checks and always allows the run.
- **Quota scaffolding (present, dormant):**
  - `pipeline_runs` already logs every run (Section 4) — this is the meter; it just
    isn't *enforced* yet.
  - Add a helper `checkPipelineQuota(userId)` that, **when the flag is on**, would:
    count today's runs (IST day) for the user, compare against a plan limit, and
    return `{ allowed, reason }`. When the flag is off it returns `{ allowed: true }`.
  - Reserve plan fields on the existing `profiles` table (MazaCV already has plan/credits)
    — do **not** add new billing tables now.
- **Razorpay:** MazaCV already integrates Razorpay for other actions. **Do not wire any
  new payment flow for the pipeline now.** Just leave a clearly-commented stub
  (`// TODO(payments): gate pipeline runs once tiers are decided`) at the quota check.
- **Tiers (placeholder, NOT final):** e.g. free = 1 run/day, Pro = more — numbers TBD.
  Document only; enforce nothing.

**Acceptance for this section:** with `PIPELINE_QUOTA_ENABLED=false`, a user can trigger
the pipeline freely (subject only to it being technically configured). Flipping the flag
later (plus setting limits) is the only change needed to turn monetization on.

---

## 10. Build order (each step: `npm run build` green)

1. Supabase schema (Section 4) — run in MazaCV's project.
2. `src/lib/jobboard.ts` + `/api/jobboard/{config,jobs}` (read path) — Queue reads Supabase.
3. Settings autosave → `/api/jobboard/config`; migrate `PMSettingsForm` off localStorage.
4. `/api/jobboard/refresh` (quota gate = no-op) + `pipeline_runs` insert + `triggerScrape`.
5. "Fresh jobs leke aao 🔄" button → refresh → redirect to Queue.
6. Queue banner + `/api/jobboard/run-status` polling + filters (Min-Fit default 40);
   add the **fit-score explainer panel + per-job `scores_json` breakdown** (Section 7B)
   to both the search-jobs page and the Queue.
7. `scraper/` package (copy + de-couple; `store.py` + `run.py`).
8. `.github/workflows/scrape.yml` + secrets; make repo public for free Actions.
9. End-to-end: button → Action → rows in Supabase → banner clears → Queue shows jobs.
10. (Later, separate task) flip `PIPELINE_QUOTA_ENABLED` + set tiers — NOT in this build.

---

## 11. Guardrails
- One trigger button; settings autosave = pipeline creation. No "create" button.
- Async: fire → 202 → redirect → poll. Never block the request on the scrape.
- Partial success allowed; skip portals with missing cookies, don't fail the run.
- Store full JD `description` (needed for "Score against this job").
- Score parity: `scraper/score.py` must match `src/lib/jobScore.ts`.
- `scraper/` self-contained — no import of the external job-hunter repo.
- Zero-config: missing token/secrets → graceful "not configured", never crash.
- **Payments stay inert** until the flag is flipped (Section 9).
- No slang in any exported resume (Hinglish UI copy is fine).

## 12. What's needed from the owner (when starting Section 7+)
- `ADZUNA_APP_ID` / `ADZUNA_API_KEY` (confirm in Vercel + add as Action secrets).
- `GH_DISPATCH_TOKEN` (fine-grained PAT, Actions:write on this repo) in Vercel.
- Go-ahead to run the schema against MazaCV Supabase; confirm repo can be made public.
- Cookie portals (last): fresh `NAUKRI_COOKIE`, `FOUNDIT_COOKIE`, `IIMJOBS_COOKIE`.
