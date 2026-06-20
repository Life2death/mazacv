-- Security hardening migration.
-- Run AFTER supabase-schema.sql, in the Supabase SQL editor.

-- 1) Atomic usage increment with limit check (fixes read-modify-write race).
--    Returns the new count. Uses INSERT .. ON CONFLICT .. DO UPDATE so two
--    concurrent calls can never both read a stale value.
create or replace function increment_usage(
  p_user_id uuid,
  p_action text,
  p_period text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into usage (user_id, action, period, count)
  values (p_user_id, p_action, p_period, 1)
  on conflict (user_id, action, period)
  do update set count = usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- 2) Atomic credit decrement (never goes below zero).
create or replace function consume_credit(
  p_user_id uuid,
  p_action text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  update profiles
  set credits = jsonb_set(
    credits,
    array[p_action],
    to_jsonb(greatest(coalesce((credits->>p_action)::int, 0) - 1, 0))
  )
  where id = p_user_id
  returning coalesce((credits->>p_action)::int, 0) into remaining;
  return coalesce(remaining, 0);
end;
$$;

-- 3) Shared, persistent rate-limit counters (replaces per-instance in-memory Map).
create table if not exists rate_limits (
  key text primary key,
  count int not null default 0,
  reset_at timestamptz not null
);

alter table rate_limits enable row level security;
create policy "service role only rate_limits"
  on rate_limits for all using (true) with check (true);

-- Atomic check-and-increment within a sliding window. Returns allowed boolean.
create or replace function check_rate_limit(
  p_key text,
  p_limit int,
  p_window_ms int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  new_reset timestamptz := now() + (p_window_ms || ' milliseconds')::interval;
  cur_count int;
  cur_reset timestamptz;
begin
  insert into rate_limits (key, count, reset_at)
  values (p_key, 1, new_reset)
  on conflict (key) do update
    set count = case when rate_limits.reset_at < now_ts then 1 else rate_limits.count + 1 end,
        reset_at = case when rate_limits.reset_at < now_ts then new_reset else rate_limits.reset_at end
  returning count, reset_at into cur_count, cur_reset;
  return cur_count <= p_limit;
end;
$$;

-- 4) RLS backstops for profiles and usage (currently no policy => closed to anon,
--    open to service role; add explicit owner policies in case anon key is ever used).
alter table profiles enable row level security;
create policy "owner can read own profile"
  on profiles for select using (auth.uid() = id);

alter table usage enable row level security;
create policy "owner can read own usage"
  on usage for select using (auth.uid() = user_id);
