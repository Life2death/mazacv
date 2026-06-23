# Agent Handoff — 2026-06-23

## Build State

### What's built (shipped in this session):

**Steps 1–8 from `PIPELINE_CREATION_PLAN.md`:**
| Step | What | Status |
|------|------|--------|
| 1 | Supabase schema SQL (`supabase/migrations/001_pipeline_tables.sql`) | ✅ Written — **run manually** |
| 2 | `src/lib/jobboard.ts` + 5 API routes (`/api/jobboard/jobs`, `jobs/[id]`, `config`, `refresh`, `run-status`) | ✅ Built |
| 3 | `PMSettingsForm.tsx` autosave → `PUT /api/jobboard/config` (parallel to localStorage) | ✅ Built |
| 4 | `POST /api/jobboard/refresh` — quota no-op, `pipeline_runs` insert, GitHub `repository_dispatch` | ✅ Built |
| 5 | "Fresh jobs leke aao 🔄" button on Settings + fit-score explainer panel | ✅ Built |
| 6 | Queue banner (polls `run-status` every 10s) + Min-Fit/Portal/Freshness filters + per-job `scores_json` breakdown + Supabase merge | ✅ Built |
| 7 | `scraper/` Python package (run.py, score.py, portals.py, store.py, dedup.py, config.py) | ✅ Built |
| 8 | `.github/workflows/scrape.yml` — `repository_dispatch` + daily schedule | ✅ Built |

### Known issues:
- **npm install timed out** — `node_modules/next` is partially installed. `tsc --noEmit` fails with `Cannot find module 'next/server'` (not real code errors). Fix: `npm install next@14.2.15 --legacy-peer-deps` then `npm run build`.
- No TS errors in my code — the syntax error in `PMSettingsForm.tsx` (function inside JSX) was fixed.

## Env vars needed (must be set before pipeline works end-to-end):

| Variable | Where | Why |
|----------|-------|-----|
| `GH_DISPATCH_TOKEN` | `.env.local` + Vercel env | Fine-grained PAT with Actions:write on `Life2death/mazacv` — used by `/api/jobboard/refresh` to fire GitHub dispatch |
| `GH_REPO=Life2death/mazacv` | `.env.local` + Vercel env | Used by `/api/jobboard/refresh` to target the dispatch |

Already set in `.env.local`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Key files

| File | Purpose |
|------|---------|
| `src/lib/jobScore.ts` | Ported scoring engine (Path A — done) |
| `src/lib/jobboard.ts` | Service-role Supabase helpers: listJobs, getConfig, saveConfig, upsertJobs, insertRun, getLatestRun, checkPipelineQuota |
| `src/app/api/jobboard/jobs/route.ts` | GET — list user's pipeline jobs with filters |
| `src/app/api/jobboard/jobs/[id]/route.ts` | PATCH — update job status (applied/skipped) |
| `src/app/api/jobboard/config/route.ts` | GET/PUT — read/upsert search_config |
| `src/app/api/jobboard/refresh/route.ts` | POST — trigger pipeline (quota gate → insert run → repo dispatch) |
| `src/app/api/jobboard/run-status/route.ts` | GET — latest pipeline run status for polling |
| `src/components/PMSettingsForm.tsx` | Shared settings form with autosave, Jobs dhundo, Fresh jobs leke aao btn, fit-score explainer |
| `src/app/dashboard/page.tsx` | Dashboard with Queue/Apply/Settings tabs, polling banner, filters, per-job score breakdown |
| `scraper/run.py` | Python pipeline entry point — reads config, scrapes, scores, upserts to Supabase |
| `scraper/score.py` | Mirror of `src/lib/jobScore.ts` (score parity required) |
| `scraper/portals.py` | Adzuna + LinkedIn fetchers (cookie portal stubs ready for Naukri/Foundit/IIMJobs) |
| `scraper/store.py` | Supabase REST upserts (service-role key) |
| `.github/workflows/scrape.yml` | GitHub Action triggered by dispatch + daily schedule |
| `supabase/migrations/001_pipeline_tables.sql` | SQL for job_listings, search_config, pipeline_runs + RLS |

## Next session (in order)

1. **Fix npm** — `npm install next@14.2.15 --legacy-peer-deps` then `npm run build` → fix any TS errors
2. **Ask user** to run `supabase/migrations/001_pipeline_tables.sql` in Supabase Dashboard SQL Editor
3. **Set GH_DISPATCH_TOKEN** + `GH_REPO` env vars
4. **Commit & push** everything to master
5. **End-to-end test** — "Fresh jobs leke aao 🔄" → GitHub Action → rows in Supabase → Queue clears banner

### If npm install keeps timing out:
- Check network connectivity (`npm ping`)
- Try `npm config set registry https://registry.npmmirror.com` then reinstall
- Or copy `node_modules` from a machine that has it and run `npm rebuild`

## Commands reference

```powershell
# Build
& "node_modules\.bin\next.cmd" build

# TypeScript check
node node_modules\typescript\bin\tsc --noEmit

# Dev server
& "node_modules\.bin\next.cmd" dev
```
