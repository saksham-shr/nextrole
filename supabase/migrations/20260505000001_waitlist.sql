-- Waitlist for managed credit plans (Starter, Pro, Team)
-- Referenced by /api/waitlist/route.ts

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  tier       text not null check (tier in ('starter', 'pro', 'team', 'managed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (email, tier)
);

-- RLS: only service role can read (admin use only)
alter table public.waitlist enable row level security;

create policy "Service role only"
  on public.waitlist
  using (false);
