-- ============================================================
-- AgentSaathi — Colleagues, invitations, time tracking, activity
-- Run AFTER schema.sql in Supabase SQL Editor.
-- ============================================================

-- ----- agents: support colleagues linked to an owning agent -----
alter table public.agents
  add column if not exists parent_agent_id uuid references public.agents (id) on delete cascade;

alter table public.agents
  add column if not exists permissions jsonb not null
  default '{"ai":true,"clients":true,"upload":true,"email":true}'::jsonb;

-- allow the 'colleague' role
alter table public.agents drop constraint if exists agents_role_check;
alter table public.agents
  add constraint agents_role_check check (role in ('agent', 'admin', 'colleague'));

create index if not exists agents_parent_idx on public.agents (parent_agent_id);

-- ============================================================
-- invitations: an owner agent invites a colleague via a token URL.
-- ============================================================
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade, -- inviting owner
  token text not null unique,
  email text,
  permissions jsonb not null
    default '{"ai":true,"clients":true,"upload":true,"email":true}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  accepted_by uuid references public.agents (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists invitations_agent_idx on public.invitations (agent_id);
create index if not exists invitations_token_idx on public.invitations (token);

-- ============================================================
-- time_entries: clock in / clock out per colleague (or agent).
-- ============================================================
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,  -- who clocked
  owner_id uuid not null references public.agents (id) on delete cascade,  -- owning agent
  clock_in timestamptz not null default now(),
  clock_out timestamptz
);
create index if not exists time_entries_agent_idx on public.time_entries (agent_id);
create index if not exists time_entries_owner_idx on public.time_entries (owner_id);

-- ============================================================
-- activity_log: actions taken (searches, views, uploads, emails, clock).
-- ============================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,  -- actor
  owner_id uuid not null references public.agents (id) on delete cascade,  -- owning agent
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_owner_idx on public.activity_log (owner_id, created_at desc);
create index if not exists activity_log_agent_idx on public.activity_log (agent_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.invitations enable row level security;
alter table public.time_entries enable row level security;
alter table public.activity_log enable row level security;

-- invitations: only the owning agent manages them.
drop policy if exists invitations_owner_all on public.invitations;
create policy invitations_owner_all on public.invitations
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- time_entries: the owner or the actor can read; the actor writes their own.
drop policy if exists time_entries_read on public.time_entries;
create policy time_entries_read on public.time_entries
  for select using (owner_id = auth.uid() or agent_id = auth.uid());

drop policy if exists time_entries_write on public.time_entries;
create policy time_entries_write on public.time_entries
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- activity_log: the owner or the actor can read; the actor writes their own.
drop policy if exists activity_log_read on public.activity_log;
create policy activity_log_read on public.activity_log
  for select using (owner_id = auth.uid() or agent_id = auth.uid());

drop policy if exists activity_log_write on public.activity_log;
create policy activity_log_write on public.activity_log
  for insert with check (agent_id = auth.uid());

-- ============================================================
-- Let an owner agent (and their colleagues) read each other's agent rows
-- so names/emails show up in the colleagues UI.
-- ============================================================
drop policy if exists agents_select_team on public.agents;
create policy agents_select_team on public.agents
  for select using (
    id = auth.uid()
    or public.is_admin()
    or parent_agent_id = auth.uid()
    or id = (select parent_agent_id from public.agents where id = auth.uid())
  );
