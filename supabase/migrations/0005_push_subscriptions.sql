-- ============================================================
-- 0005_push_subscriptions
-- Web Push (PWA notification) subscriptions, one+ per agent/device.
-- Run in Supabase SQL editor (or via your migration tooling).
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  -- The PushSubscription endpoint is globally unique per browser/device.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_agent_idx
  on public.push_subscriptions (agent_id);

alter table public.push_subscriptions enable row level security;

-- Owner-only: an agent manages only their own device subscriptions.
drop policy if exists push_subscriptions_owner_all on public.push_subscriptions;
create policy push_subscriptions_owner_all on public.push_subscriptions
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
