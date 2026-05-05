-- Team membership table
-- 5 seats per Team subscription: 1 owner + up to 4 members

create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  member_id     uuid references public.profiles(id) on delete set null,
  invited_email text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'active', 'removed')),
  invited_at    timestamptz not null default now(),
  joined_at     timestamptz,
  unique (owner_id, invited_email)
);

create index if not exists team_members_owner_idx  on public.team_members (owner_id);
create index if not exists team_members_member_idx on public.team_members (member_id) where status = 'active';
create index if not exists team_members_email_idx  on public.team_members (invited_email) where status = 'pending';

alter table public.team_members enable row level security;

-- Owner can read and manage all rows for their team
create policy "Owner manages team"
  on public.team_members
  for all
  using (owner_id = auth.uid());

-- Members can see and update their own row
create policy "Member views own row"
  on public.team_members
  for select
  using (member_id = auth.uid());

-- ─── RPC: revoke all active members when owner's subscription ends ────────────
-- Called from webhook on expired/refunded events.
create or replace function public.revoke_team_members(p_owner_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Revert all active members to free tier
  update public.profiles
  set tier = 'free', updated_at = now()
  where id in (
    select member_id
    from   public.team_members
    where  owner_id = p_owner_id
      and  status   = 'active'
      and  member_id is not null
  );

  -- Mark all non-removed rows as removed
  update public.team_members
  set status = 'removed'
  where owner_id = p_owner_id
    and status in ('pending', 'active');
end;
$$;
