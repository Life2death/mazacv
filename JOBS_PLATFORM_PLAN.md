# MazaCV — Jobs Platform Plan (Dashboard + Queue + Rapid Apply + PM Settings)

> **Goal:** turn the post-login experience on mazacv.in into a job-hunting cockpit:
> a **Dashboard** with **Jobs Queue**, **Rapid Apply**, and **Settings (PM)**,
> powered by MazaCV's **own** multi-portal job scraper.
>
> **Confirmed architecture (owner decisions, 2026-06-23):**
> - **Fully self-contained in MazaCV.** We are **copying the scraping + scoring
>   _logic_** into the MazaCV repo. There is **NO reference to, or dependency on,
>   any external job-hunter pipeline** — separate repo, separate DB, no Render, no
>   shared keys. If it isn't in this repo, it doesn't exist for this feature.
> - A **button in MazaCV** triggers **MazaCV's own GitHub Action**, which runs the
>   scraper and writes results into **MazaCV's own Supabase** (`job_listings`).
> - The **dashboard reads `job_listings` from MazaCV's Supabase**, server-side,
>   exactly like it already reads `scans` today.
>
> **Why the scraper is Python on GitHub Actions (not TS on Vercel):** the portal
> fetchers need `curl_cffi` browser impersonation, forced IPv4, per-portal session
> cookies, and long multi-page runs with sleeps. None of that works on Vercel's
> serverless runtime. GitHub Actions is the correct execution home. The Next.js app
> and the Python scraper **never import each other** — they communicate ONLY
> through MazaCV's Supabase `job_listings` table.
>
> **v1 scope:** **PM track only** ("Settings refers to PM screen only — simple and
> straight"). The copied scoring logic also knows SM/DIR, but v1 drives only the PM
> track from user settings.

---

## Data flow (end to end) — all inside MazaCV

```
[/dashboard → Settings tab]
   user edits PM config (keywords, locations CSV, comp floor, experience)
   → PUT /api/jobboard/config  → MazaCV Supabase: search_config (1 row/user)

[/dashboard → "Refresh jobs" button]
   → POST /api/jobboard/refresh
   → GitHub repository_dispatch on Life2death/mazacv (OWN repo)
        event_type: "scrape-request", client_payload: { email }

[GitHub Action: .github/workflows/scrape.yml  (in THIS repo)]
   checkout → pip install scraper/requirements.txt → run:
     python -m scraper.run --track PM --email <email>
   • reads search_config FROM MazaCV Supabase (builds the PM search list)
   • scrapes portals, scores (score_job + freshness), keeps FULL description
   • scraper/store.py UPSERTs into MazaCV Supabase: job_listings

[/dashboard → Jobs Queue / Rapid Apply tabs]
   → GET /api/jobboard/jobs  → reads job_listings from MazaCV Supabase (service role)
   mark Apply/Skip/Not-interested → PATCH /api/jobboard/jobs/:id (status)
   "Score against this job" → /scan?jd=<description>  (existing flow)
```

---

## Repo layout — new `scraper/` package (Python, this repo)

The scraping logic is **copied and de-coupled** into a self-contained package.
Strip every external import (`from settings import ...`, `from dedup import ...`,
`cloud_db`); inline what's needed so the package stands alone with no outside
references.

```
scraper/
  __init__.py
  run.py            # entry: argparse (--track, --portal, --email, --test); orchestrates
  portals.py        # fetch_linkedin / fetch_adzuna / fetch_foundit / fetch_iimjobs / fetch_naukri  (copied)
  score.py          # score_job, freshness, location_score, comp_score, company_tier               (copied)
  config.py         # keyword sets, COMP_FLOOR/TARGET, location maps, FRESH_MAX/AGING_MAX            (copied/inlined)
  dedup.py          # canonical_url()                                                                (copied)
  store.py          # NEW: read search_config + UPSERT job_listings via Supabase REST (self-contained)
  requirements.txt  # requests, curl_cffi, beautifulsoup4, lxml, pycryptodome, (supabase or just requests)
```

**What's copied verbatim (logic only):** the five `fetch_*` portal functions, the
scoring rubric (`score_job`), `freshness()`, `location_score`, `comp_score`,
`company_tier`, and the keyword/location constants they depend on.

**What's rewritten fresh (no external reference):**
- `store.py` — reads the user's `search_config` row and UPSERTs scored rows into
  `job_listings` using MazaCV's Supabase URL + service-role key (REST `upsert` on
  `canon_url`/`job_id`, or `supabase-py`). No `cloud_db`, no profiles writes.
- `run.py` — builds the PM search list from `search_config` (split `keywords` /
  `locations` CSVs into `{keyword, location}` pairs; set comp floor), loops portals,
  scores, dedups, calls `store.upsert()`.

---

## PART A — MazaCV Supabase schema (`supabase-schema.sql`)

Two new tables in MazaCV's existing project. No `profiles` collision — we only add
new tables.

```sql
create table if not exists job_listings (
  job_id        text primary key,          -- "li_123" / "adz_abc" / "nk_999"
  user_id       uuid references auth.users(id) on delete cascade,
  track         text not null,             -- "PM" for v1
  portal        text not null,             -- LinkedIn / Adzuna / Foundit / IIMJobs / Naukri
  title         text not null,
  company       text not null,
  location      text,
  salary        text,                      -- "min-max" label
  posted        text,                      -- raw posted string
  url           text,
  canon_url     text,                      -- dedup key (scraper/dedup.canonical_url)
  fit           integer default 0,         -- score_job total + freshness penalty
  freshness     text,                      -- FRESH / AGING / STALE / UNKNOWN
  scores_json   jsonb,                     -- {"s": {factor: pts}, "f": [flags]}
  description   text,                      -- FULL JD text (for "score against this job")
  status        text default 'not_applied',-- not_applied / applied / skipped / not_interested
  imported_date date not null default current_date,
  applied_date  date,
  last_seen_date date
);
create index if not exists idx_jl_user   on job_listings(user_id);
create index if not exists idx_jl_status on job_listings(status);
create index if not exists idx_jl_fit    on job_listings(fit desc);
create index if not exists idx_jl_canon  on job_listings(canon_url);

create table if not exists search_config (
  user_id    uuid references auth.users(id) on delete cascade primary key,
  email      text,                          -- so the Action can map rows by email
  track      text default 'PM',
  keywords   text,                          -- comma-separated
  locations  text,                          -- comma-separated CSV
  comp_floor integer,                        -- LPA floor
  experience text,                           -- free text, e.g. "12-16 years"
  enabled    boolean default true,
  updated_at timestamptz default now()
);

alter table job_listings enable row level security;
alter table search_config enable row level security;
create policy "own jobs"   on job_listings for select using (auth.uid() = user_id);
create policy "own config" on search_config for all   using (auth.uid() = user_id);
-- The Action writes with the service-role key (bypasses RLS); the app reads
-- server-side with the service role too (same as scans).
```

---

## PART B — MazaCV app changes (Next.js)

### B1 — `src/lib/jobboard.ts` (new) — server-side data layer
Reuses the existing service-role Supabase client (same one `/api/scans` uses).
Zero-config: missing tables/env → empty list, never crash.
- `JobRow` type mirroring `job_listings`.
- `listJobs(userId, { portal?, status?, minFit?, freshness?, q? })` → `fit desc`.
- `updateJobStatus(userId, jobId, status)` → sets status (+`applied_date` on apply).
- `getConfig(userId)` / `saveConfig(userId, cfg)` → `search_config`.
- `triggerScrape(email)` → GitHub `repository_dispatch` on **this** repo (B5).

### B2 — API routes (new, auth-gated via `getSessionUser`)
| Route | Method | Action |
|---|---|---|
| `src/app/api/jobboard/jobs/route.ts` | GET | list jobs for user (query = filters) |
| `src/app/api/jobboard/jobs/[id]/route.ts` | PATCH | update one job's `status` |
| `src/app/api/jobboard/config/route.ts` | GET / PUT | read / upsert PM search config |
| `src/app/api/jobboard/refresh/route.ts` | POST | fire the GitHub Action; return 202 |

### B3 — Route restructure: `/dashboard` (job board) + `/history` (scans)

**`/dashboard`** becomes the post-login home with tabs (URL-synced
`?tab=queue|apply|settings`; default `queue`).

**`/history`** gets the **existing scan history content** (moved from old `/dashboard`).
Keep the exact same UI — scans list with score, edit, publish, delete.

**Tab 1 — Jobs Queue** (`components/JobQueueTable.tsx`)
Port of the scraper's HTML report table:
- Columns: Fit (badge ≥60 green / ≥40 amber / else grey), Fresh, Portal, Title,
  Company, Location, Salary, Status, ↗ link-out to original posting.
- Client filters: Portal, Status, Min Fit, Freshness, free-text search; sortable;
  default Fit desc. Hinglish header. ToS-safe link-out (no public JD re-host).

**Tab 2 — Rapid Apply** (`components/RapidApplyDeck.tsx`)
One job at a time:
- Card: fit, freshness, title, company, location, salary, top score factors.
- Buttons: **Apply** (open `url` + status=applied), **Skip** (skipped),
  **Not interested** (not_interested), **Score against this job** →
  `/scan?jd=<description>` (existing `?jd=` handler). Keyboard A/S/N. Progress
  "12 / 48". Empty `description` → ask to paste JD instead of scoring empty.

**Tab 3 — Settings (PM)** (`components/PMSettingsForm.tsx`)
**Migration:** extract the form fields from the existing `src/app/settings/page.tsx`
into this shared component. The existing form already has everything needed:
Keywords, Target Job Titles, Location, Min Salary (LPA), Max Freshness dropdowns.
Changes needed:
- Add save/load to/from `search_config` API (PUT /api/jobboard/config)
- Keep the existing "Jobs dhundo 🔍" button for instant Adzuna/LinkedIn search
- Add **"Refresh jobs now 🔄"** button → POST `/api/jobboard/refresh` → toast
  "Jobs nikalne bhej diya — thodi der mein update hoga"
- Show `updated_at` + last import date

### B4 — NavBar
- Replace "Jobs" → `/settings` link with **"Dashboard"** → `/dashboard`
- Keep "Score" → `/scan`
- Add "History" → `/history` in the user dropdown menu
- `/settings` route becomes a **redirect** → `/dashboard?tab=settings`

### B5 — Trigger the Action (same repo): `triggerScrape()`
```
POST https://api.github.com/repos/Life2death/mazacv/dispatches
Authorization: Bearer <GH_DISPATCH_TOKEN>     # fine-grained PAT, Actions: write on THIS repo
Accept: application/vnd.github+json
{ "event_type": "scrape-request", "client_payload": { "email": "<user email>" } }
```
Env (Vercel): `GH_DISPATCH_TOKEN`. Unset → refresh returns friendly "not
configured" (zero-config). No `JOBHUNTER_*` vars — nothing external.

---

## PART C — GitHub Action (this repo): `.github/workflows/scrape.yml`
```yaml
on:
  workflow_dispatch:
  repository_dispatch:
    types: [scrape-request]
  schedule:
    - cron: "30 1 * * *"   # daily 07:00 IST; optional
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r scraper/requirements.txt
      - run: python -m scraper.run --track PM --email "${EMAIL:-$DEFAULT_EMAIL}"
        env:
          EMAIL: ${{ github.event.client_payload.email }}
          DEFAULT_EMAIL: ${{ secrets.DEFAULT_EMAIL }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}                 # MazaCV project
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ADZUNA_APP_ID: ${{ secrets.ADZUNA_APP_ID }}
          ADZUNA_API_KEY: ${{ secrets.ADZUNA_API_KEY }}
          NAUKRI_COOKIE: ${{ secrets.NAUKRI_COOKIE }}
          FOUNDIT_COOKIE: ${{ secrets.FOUNDIT_COOKIE }}
          IIMJOBS_COOKIE: ${{ secrets.IIMJOBS_COOKIE }}
```

---

## Environment variables / secrets (all MazaCV-owned)

**Vercel:** `GH_DISPATCH_TOKEN` (PAT scoped to Life2death/mazacv Actions). Supabase
vars already set; reused to read `job_listings`.

**GitHub Actions secrets (this repo):** `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ADZUNA_APP_ID`, `ADZUNA_API_KEY`, `NAUKRI_COOKIE`,
`FOUNDIT_COOKIE`, `IIMJOBS_COOKIE`, `DEFAULT_EMAIL`.

---

## Operational realities (flag, don't block)
- **Portal cookies expire.** Naukri/Foundit/IIMJobs need logged-in session cookies
  that go stale (Naukri 403 when expired). Adzuna (API key) and LinkedIn (guest)
  need none. **v1 can run Adzuna + LinkedIn only** for zero cookie maintenance, and
  enable the cookie portals when you can refresh them. Make the portal list a
  workflow input.
- **Latency.** A run is ~1-3 min. Refresh is fire-and-forget; the dashboard polls
  `job_listings` / shows "last updated" rather than blocking.
- **First-run empty state.** Before the first scrape, show "Settings bhar ke
  Refresh dabao".

---

## Build order (each step: `npm run build` green, commit, push)

### ✅ Already merged in master (no build work needed)
- `/settings` page with full form (keywords, job titles, location, salary, freshness)
- `findJobs()` with `jobTitles/salaryMinLPA/maxFreshnessDays` options
- Debug panel on job search results
- NavBar "Jobs" link (needs update to "Dashboard")
- `NEXT_PUBLIC_DEV_USER_EMAIL` bypass in AuthProvider
- `TEMPLATE_REVIEW.md`

### 🔧 Still to build (in order)
1. **Schema** — add `job_listings` + `search_config` to `supabase-schema.sql`; run in MazaCV Supabase. *(A)*

2. **Route restructure** — create `/history` page (move existing `/dashboard` content there); add `/settings` → `/dashboard?tab=settings` redirect in `next.config.mjs` or a catch-all route. *(B3, B4)*

3. **Settings migration** — extract form from `src/app/settings/page.tsx` into `components/PMSettingsForm.tsx`; wire save/load to `search_config` API (build the API first). *(B2, B3-tab3)*

4. **Read path** — `src/lib/jobboard.ts` + `GET /api/jobboard/jobs` + Jobs Queue tab on `/dashboard`. Works on hand-seeded rows. *(B1, B2, B3-tab1)*

5. **Status path** — `PATCH /api/jobboard/jobs/:id` + Rapid Apply tab + "Score against this job". *(B2, B3-tab2)*

6. **Dashboard page** — write `src/app/dashboard/page.tsx` with tab navigation (Queue, Apply, Settings tabs). *(B3)*

7. **NavBar update** — "Dashboard" CTA replaces "Jobs" link; add "History" to dropdown. *(B4)*

8. **Scraper package** — copy + de-couple logic into `scraper/`; write `store.py` + `run.py`; `requirements.txt`. *(scraper/)*

9. **Action + trigger** — `scrape.yml` + `POST /api/jobboard/refresh` + `triggerScrape()` + Refresh button on Settings tab. *(C, B5)*

10. **End-to-end** — Refresh → Action → rows in MazaCV Supabase → dashboard → Rapid Apply → Score. *(E2E)*

Steps 2-7 are pure Next.js and ship first (queue works on hand-seeded rows), so the
UI is never blocked on the scraper.

---

## Guardrails
- **No external references.** `scraper/` must not import or call anything outside
  this repo; no mention of any other pipeline/DB/host anywhere in code, env, or docs.
- Zero-config: missing scraper secrets → Action no-ops gracefully; missing
  `GH_DISPATCH_TOKEN` → Refresh shows "not configured", dashboard still reads
  whatever rows exist.
- Keep MazaCV's ATS scorer as the resume-vs-JD scorer; the scraper's `fit` is only
  a job-match badge in the queue.
- No slang in any exported resume (queue/microcopy Hinglish is fine).
