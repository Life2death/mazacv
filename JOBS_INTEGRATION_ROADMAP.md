# Jobs Integration Roadmap — job-hunter → MazaCV

> **Goal:** turn the owner's existing **job-hunter** pipeline (Python scraper →
> Supabase `job_listings`, runs daily) into a **live job board inside MazaCV**,
> so users browse real jobs and score/tailor their resume against a real JD —
> instead of pasting a JD by hand.
>
> **This is a draft.** Build it, we review, then add/remove. Don't over-engineer
> the first pass — get the board + "score against this job" working end to end,
> then iterate.
>
> **Two repos involved:**
> - `Life2death/mazacv` (this repo) — the board UI + read integration
> - `Life2death/job-hunter` (separate Python repo) — must persist the JD text
>
> **Key facts established by reviewing job-hunter's code (do not re-assume):**
> - Main table is **`job_listings`** with: `job_id, track, portal, title,
>   company, location, salary, posted, url, canon_url, fit, scores_json,
>   status, freshness, imported_date, applied_date, user_id`.
> - ⚠️ It does **NOT store the JD text** — the scraper grabs `description` only
>   as a transient, 500-char-truncated snippet for scoring, then discards it.
> - `fit` / `scores_json` is **profile-fit** scoring (does this job match the
>   candidate), which is DIFFERENT from MazaCV's ATS resume-vs-JD scoring. Keep
>   MazaCV's ATS scorer as the scorer; surface `fit` only as a secondary signal.
> - job-hunter has its OWN Supabase `profiles` table (email/approved) that
>   COLLIDES by name with MazaCV's `profiles` (plan/credits). **Do NOT merge the
>   two into one Supabase project.** Integrate cross-project (read-only).

---

## PART A — job-hunter side (small Python change, separate PR in that repo)

### JOB-A1 — Persist the full JD text
**Why:** MazaCV's ATS scorer + AI tailor need the full JD. Today it's truncated
and dropped.
- Add a `description` (TEXT) column to `job_listings` (schema.sql + cloud_db.py
  insert/REFRESH_COLS).
- Remove the `[:500]` truncation where descriptions are captured in
  `multi_portal_job_hunter.py` (store the full text; strip HTML to plain text).
- Backfill is optional — new daily runs will populate it going forward.
**Acceptance:** new scraped rows store the full JD text; daily extraction still
runs green; no regression to existing columns/flags.

### JOB-A2 — Expose listings to MazaCV (pick ONE)
- **Option 1 (simplest): shared read access.** MazaCV reads job-hunter's
  Supabase `job_listings` directly using a **read-only** key (or a DB role
  limited to SELECT on that table). Cross-project — different Supabase project
  from MazaCV's.
- **Option 2: a tiny read API** in job-hunter (Flask already exists) — e.g.
  `GET /api/jobs?track=&portal=&limit=` returning JSON. MazaCV calls it.
**Recommend Option 1** for the first pass (no new service to run).
**Acceptance:** MazaCV can fetch a page of job rows (incl. `description`) for a
given user/track.

---

## PART B — MazaCV side (this repo)

### JOB-B1 — Jobs data access layer
- Add a `src/lib/jobs.ts` that reads job-hunter's `job_listings` (env-gated:
  `JOBHUNTER_SUPABASE_URL` + a read-only key, OR `JOBHUNTER_API_URL`). When
  unset, the board shows an empty state — never crash (zero-config rule).
- Map a job row → a clean `JobListing` type (`id, title, company, location,
  salary, postedAt, url, portal, fit, description`).
**Acceptance:** a server function returns a typed, paginated list of jobs;
absent config → empty list, no error.

### JOB-B2 — Job board UI (`/jobs`)
- New `/jobs` page: searchable/filterable list (by keyword, portal, freshness),
  each card shows title, company, location, salary, "fit" badge, posted date,
  and a link-out to the original posting.
- Hinglish microcopy in the MazaCV style; mobile-first.
- **ToS-safe:** link OUT to the original posting; do not re-host full JD text
  publicly. Consider gating the board behind login.
- Add "Jobs" to the NavBar.
**Acceptance:** `/jobs` lists real jobs from job-hunter; filters work; mobile
clean; build passes.

### JOB-B3 — "Score against this job"
- On a job card / job detail, a button: **"Is job ke liye score nikaal"**.
- Clicking it takes the job's stored `description` (JD text) and pipes it into
  the existing scorer flow (prefill the JD, run `/api/score`) → user lands on
  the normal score → AI-tailor → export flow.
- If a job has no stored `description` yet (old rows), fall back to: ask the
  user to paste the JD, OR (later) fetch on demand. Do NOT silently score
  against an empty JD.
**Acceptance:** picking a real job auto-fills the JD and produces a real ATS
score; missing-JD case handled gracefully.

### JOB-B4 — One-click "Add to tracker"
- From a job card, "Track this" creates an `applications` row (company, role,
  jd, score, scan link) in the existing Day-12 Kanban — closing the loop:
  discover → score → tailor → track.
**Acceptance:** a job can be added to the tracker in one click; appears in
`/tracker` under "Saved".

---

## Decisions to confirm at review (flag, don't block)
- ToS posture: link-out only vs. login-gated board vs. official job APIs
  (Adzuna/Jooble) for the public surface. Start with **link-out + login-gated**.
- Whether the board is **free** or a **Pro** feature. (Leaning free for the
  funnel; "score against job" stays gated like other AI actions.)
- Cross-project access method (shared read key vs Flask API) — Option 1 first.
- Personalisation: show all jobs vs. only the logged-in user's job-hunter rows
  (job-hunter rows are per `user_id` = the owner's email today; multi-user needs
  thought — for v1 it may just be the owner's pipeline feeding a shared board).

## Guardrails (same as the daily roadmap)
- Zero-config: no job-hunter keys → `/jobs` shows a friendly empty state.
- Keep MazaCV's ATS scorer as the scorer; `fit` is only a secondary badge.
- No slang in any exported resume.
- Verify `npm run build` after each step; commit + push per step.
- Don't merge the two Supabase projects (colliding `profiles`).
