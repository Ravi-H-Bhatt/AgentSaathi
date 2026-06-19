-- ============================================================
-- Migration 0002: team chat table
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

create table if not exists public.team_chat (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.agents (id) on delete cascade,
  sender_id uuid not null references public.agents (id) on delete cascade,
  sender_name text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists team_chat_owner_idx
  on public.team_chat (owner_id, created_at);

alter table public.team_chat enable row level security;

drop policy if exists team_chat_team_all on public.team_chat;
create policy team_chat_team_all on public.team_chat
  for all
  using (
    owner_id = auth.uid()
    or sender_id = auth.uid()
    or owner_id in (
      select parent_agent_id
      from public.agents
      where id = auth.uid()
        and parent_agent_id is not null
    )
  )
  with check (sender_id = auth.uid());
