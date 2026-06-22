# SESSION HANDOFF — 2026-06-22

> **How to resume:** point Claude Code at this file (`SESSION_HANDOFF.md` in the mazacv repo).
> It captures everything from the 2026-06-22 session so work can continue *as is*.
> **Active next task:** implement the Rapid Apply Queue in MazaCV (Part 3 below) — but
> first answer the Phase 0 decisions, they gate the build.

---

## 1. What shipped today (DONE)

### A. job-hunter dashboard count bug — FIXED & LIVE
- **Symptom:** "Today's Fetch" / "Last 7 Days" breakdowns showed unstable, single-run-looking
  counts (e.g. 168) instead of the true cumulative number (877 inserted today).
- **Root cause (proven against live Supabase):** `_fetch_all` and `/api/jobs` paged through
  `.range()` with **no stable `ORDER BY`**. Postgres returns rows in heap order, which shifts
  after writes → pages overlap (phantom duplicate rows) and skip others (undercounts). Data,
  counting logic, and deployment were all otherwise correct.
- **Proof:** same query, no order → 168/1055-dupes then 877 then 877 (random); with
  `.order("job_id")` → 877 / 0 dupes every time.
- **Fix (commit `3493e40` on Life2death/job-hunter master, deployed live on Render):**
  - `web_app.py _fetch_all`: added `.order("job_id")` (unique key) for deterministic paging.
  - `web_app.py /api/jobs` (both branches): added `.order("job_id")` tiebreaker after `fit`
    (fit is not unique).
  - "new/updated" badge + row highlighting: switched to `imported_date == today` semantic
    (was wrongly `imported_date === last_seen_date`, which marked any never-re-seen old job
    as "new" forever).
- **Verified:** user confirmed dashboard now shows correct counts after redeploy.

### B. Cookie extraction + GitHub secrets updater — WORKING (local, D:\Learning)
- Chrome 127+ uses **v20 App-Bound Encryption** → all old DB-decrypt scripts are dead
  (can't decrypt cookie values externally). Switched to **Playwright live-browser** capture.
- `D:\Learning\update_gh_secrets.py` now opens a persistent Playwright profile, captures auth
  cookies for **naukri / foundit / iimjobs**, and pushes `NAUKRI_COOKIE` / `FOUNDIT_COOKIE` /
  `IIMJOBS_COOKIE` to Life2death/job-hunter. Login once per portal; profile persists for future
  Monday runs. Login markers: naukri = nauk_at/nauk_sid/nauk_rt; foundit = MSSOAT/MSSOCLIENT/
  MSAL/IS_LOGGED_IN; iimjobs guessed (works).
- All three secrets pushed & verified today. **Foundit 403 from GitHub Actions is NOT a cookie
  bug** — it's Akamai bot-blocking the datacenter IP (worked Jun 21, intermittent). Cookie
  returns HTTP 200 from a residential IP. Naukri + IIMJobs fetch fine from cloud.

### Housekeeping still pending
- **Revoke the `claude-temp` Render API key** (Render → Account Settings → API Keys). It was
  used only to read Supabase creds for the Phase 0 diagnosis. Local files to delete:
  `D:\Learning\.render_key`, `D:\Learning\.render_env`, `D:\Learning\diag_dashboard.py`.

---

## 2. MazaCV analysis (context for the queue build)

**Stack:** Next.js App Router + TypeScript + React (client components) + Tailwind + Supabase
(service-role inside API routes) + Razorpay/Stripe. Hinglish microcopy. Auto-deploys on push.

**Key difference vs job-hunter:**
- Jobs in MazaCV are **ephemeral** — `findJobs(skills, location)` (`src/lib/jobs.ts`) hits
  Adzuna + LinkedIn live, scores by skill-match % (`fitScore`), tags freshness, returns, and
  discards. **No persisted `job_listings` table.** (job-hunter persists jobs; MazaCV does not.)
- `applications` is the **persisted** Kanban tracker (`supabase-schema.sql:72`): stages
  `saved/applied/interview/offer/rejected`, RLS-protected per user.

**Reusable assets already in the repo:**
- `POST /api/jobs` (`src/app/api/jobs/route.ts`) → `findJobs()`.
- Card UI + Hinglish fit labels: `src/components/JobsSection.tsx`.
- Applications CRUD: `POST /api/applications`, `PATCH`/`DELETE /api/applications/[id]`.
- Kanban: `src/app/tracker/page.tsx`. Scorer flow: `/api/score`.
- Existing draft `JOBS_INTEGRATION_ROADMAP.md` (JOB-B4 already wants "one-click add to tracker").

**Three gaps the queue must solve (don't exist in job-hunter):**
1. **No persistent backlog** — queue runs over one live search's results. `findJobs` currently
   caps at **3 per portal (~6 total)** (`src/lib/jobs.ts` `slice(0,3)`) — must raise/paginate.
2. **No skip/not-interested state** — `applications` has no dismissed/hidden concept and unsaved
   jobs aren't stored. Need a dismiss mechanism (see Phase 0).
3. **"Apply" = create an `applications` row** (no status flag to flip). LinkedIn rows have empty
   `description`, so "score against this job" needs a missing-JD fallback.

---

## 3. PLAN — Rapid Apply Queue in MazaCV (NOT yet built)

### Phase 0 — Decisions to confirm (ANSWER THESE FIRST; they gate the build)
- **Queue source:** live `findJobs()` results now (zero new infra; recommended) vs. wait for the
  job-hunter→Supabase integration (JOBS_INTEGRATION_ROADMAP Part A/B, not built). Build behind a
  clean adapter so the source can swap later.
- **Skip/not-interested persistence:** (a) session-only, (b) **localStorage dismiss-list keyed by
  job url** (recommended v1), or (c) a `dismissed_jobs` table (cross-device, later).
- **Skills input:** reuse last scan's parsed-resume skills vs. manual skills/location input.
- **Free vs Pro**, and **mobile** (keyboard shortcuts are desktop; mobile needs swipe/tap).

### Phase 1 — Queue data + dedup layer
- Helper calls existing `POST /api/jobs`, then **dedups against `GET /api/applications`** by
  `job_url` (fallback company+title) so tracked/dismissed jobs don't resurface.
- **Raise `findJobs` per-portal cap** / page Adzuna for real queue depth. Keep fit-desc order.
- Zero-config: no Adzuna keys → friendly empty state, never crash.

### Phase 2 — Rapid Apply queue UI (`/queue`, new client route)
- One card at a time, top-fit-first, progress counter (mirror job-hunter's UX, in React).
- Keyboard map (desktop) + on-screen buttons (mobile): `A`/Enter = open + Apply, `O` = open only,
  `S` = skip, `N` = not interested, `U` = undo, optional `T` = score against this job.
- Reuse `JobsSection.tsx` styling/fit badges + Hinglish. Login-gated.

### Phase 3 — Actions wired to existing APIs
- **Apply** → `window.open(job.url)` + `POST /api/applications`
  `{stage:'applied', company:job.company, role:job.title, job_url:job.url, jd:job.description||null, score:job.fitScore}`.
- **Save** → same with `stage:'saved'`.
- **Skip / Not-interested** → advance; persist dismiss per Phase 0.
- **Undo** → if last action created an application, `DELETE /api/applications/[id]`; else pop dismiss.

### Phase 4 — "Score against this job"
- Pipe `job.description` into the scorer (prefill JD → `/api/score`), per roadmap JOB-B3.
  **Handle empty JD** (LinkedIn rows): prompt to paste; never score against blank.

### Phase 5 — Wiring & polish
- Add "Queue"/"Rapid Apply" to `src/components/NavBar.tsx`; link from `/tracker` + dashboard.
  Empty/loading/done states in MazaCV style. Mobile layout.

### Phase 6 — Verify
- `npm run build` green; manual e2e (search → triage → applied row appears in `/tracker`
  "Applied"); commit + push per step (auto-deploys).

### Carry-over lesson from today
The pagination `ORDER BY` bug only bites IF the queue later sources from a Supabase
`job_listings` table (job-hunter integration). The live-`findJobs` v1 is in-memory, so it's
unaffected — but bake a stable sort key into that adapter from day one.

---

## 4. Resume checklist
1. Revoke Render `claude-temp` key + delete local secret files (Part 1 housekeeping).
2. Answer Phase 0 decisions.
3. Build Phases 1→6 in order, `npm run build` + commit per step.
