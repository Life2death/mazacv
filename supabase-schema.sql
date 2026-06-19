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
