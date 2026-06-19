-- Run this in the Supabase SQL editor to enable auth-based plans + usage limits.

-- Plan per user. Default "free"; Stripe webhook flips to "pro".
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free',
  credits jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Usage counters, bucketed by period (YYYY-MM-DD for scores, YYYY-MM otherwise).
create table if not exists usage (
  user_id uuid references auth.users (id) on delete cascade,
  action text not null,           -- 'score' | 'rewrite' | 'export'
  period text not null,
  count int not null default 0,
  primary key (user_id, action, period)
);

-- Auto-create a profile row on signup.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Scan history (Pro/Ek Baar).
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  jd text not null,
  resume_text text not null,
  score integer not null,
  sub_scores jsonb,
  impact jsonb,
  portal text not null default 'generic',
  rewritten_text text,
  created_at timestamptz default now()
);

alter table scans enable row level security;
create policy "Users can only see their own scans"
  on scans for all
  using (auth.uid() = user_id);

-- Idempotent payment processing — PK conflict prevents double-grant.
create table if not exists processed_payments (
  payment_id text primary key,
  user_id uuid references auth.users (id) on delete cascade not null,
  type text not null,
  created_at timestamptz default now()
);

alter table processed_payments enable row level security;
create policy "Service role only"
  on processed_payments for all
  using (true)
  with check (true);

-- Job tracker — applications Kanban.
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  company text not null,
  role text not null,
  jd text,
  job_url text,
  ats text,
  score integer,
  stage text not null default 'saved'
    check (stage in ('saved','applied','interview','offer','rejected')),
  scan_id uuid references scans (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table applications enable row level security;
create policy "Users can only see their own applications"
  on applications for all
  using (auth.uid() = user_id);

-- Public resume share links (Pro feature).
create table if not exists resume_pages (
  slug text primary key,
  scan_id uuid references scans (id) on delete cascade not null,
  user_id uuid references auth.users (id) on delete cascade not null,
  parsed_resume jsonb not null,
  template_id text not null default 'classic',
  accent_color text not null default '#4f46e5',
  published boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_resume_pages_user_id on resume_pages (user_id);
create index if not exists idx_resume_pages_scan_id on resume_pages (scan_id);
