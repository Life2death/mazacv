-- Pipeline tables for MazaCV jobs board
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Scraped, scored jobs (replaces localStorage as the Queue's source of truth)
create table if not exists job_listings (
  job_id        text primary key,
  user_id       uuid references auth.users(id) on delete cascade,
  track         text default 'PM',
  portal        text not null,
  title         text not null,
  company       text not null,
  location      text,
  salary        text,
  posted        text,
  url           text,
  canon_url     text,
  fit           integer default 0,
  freshness     text,
  scores_json   jsonb,
  description   text,
  status        text default 'not_applied',
  imported_date date not null default current_date,
  applied_date  date,
  last_seen_date date
);
create index if not exists idx_jl_user on job_listings(user_id);
create index if not exists idx_jl_fit  on job_listings(fit desc);
create index if not exists idx_jl_canon on job_listings(canon_url);

-- 2. Search preferences (one row per user)
create table if not exists search_config (
  user_id    uuid references auth.users(id) on delete cascade primary key,
  email      text,
  track      text default 'PM',
  keywords   text,
  job_titles text,
  locations  text,
  salary_min_lpa integer,
  max_freshness_days integer,
  enabled    boolean default true,
  updated_at timestamptz default now()
);

-- 3. Pipeline run log (drives the banner + quota later)
create table if not exists pipeline_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  status      text default 'queued',
  portals     text[],
  jobs_found  integer default 0,
  error       text,
  started_at  timestamptz default now(),
  finished_at timestamptz
);
create index if not exists idx_runs_user on pipeline_runs(user_id, started_at desc);

-- 4. Row-level security
alter table job_listings enable row level security;
alter table search_config enable row level security;
alter table pipeline_runs enable row level security;

create policy "own jobs"   on job_listings  for all using (auth.uid() = user_id);
create policy "own config" on search_config for all using (auth.uid() = user_id);
create policy "own runs"   on pipeline_runs for all using (auth.uid() = user_id);
