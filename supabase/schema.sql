-- ============================================================
-- AgentSaathi database schema
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run
-- ============================================================

-- ----- Extensions -----
create extension if not exists "pgcrypto";

-- ============================================================
-- agents: one row per user who signs in with Google.
-- Approval workflow: pending -> approved / rejected.
-- ============================================================
create table if not exists public.agents (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'agent' check (role in ('agent', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- clients: people insured, owned by an agent.
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  date_of_birth date,
  age int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists clients_agent_idx on public.clients (agent_id);
create index if not exists clients_name_idx on public.clients (lower(full_name));

-- ============================================================
-- policies: one insurance contract, belongs to a client.
-- ============================================================
create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  company text,
  policy_type text,
  policy_number text,
  sum_insured numeric,
  premium numeric,
  start_date date,
  renewal_date date,
  status text not null default 'active',
  source_file_path text,
  raw_extract jsonb,
  created_at timestamptz not null default now()
);
create index if not exists policies_agent_idx on public.policies (agent_id);
create index if not exists policies_client_idx on public.policies (client_id);
create index if not exists policies_renewal_idx on public.policies (renewal_date);

-- ============================================================
-- premium_charts: admin-uploaded age/type premium bands.
-- ============================================================
create table if not exists public.premium_charts (
  id uuid primary key default gen_random_uuid(),
  policy_type text,
  age_min int not null,
  age_max int not null,
  sum_insured numeric,
  premium numeric not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists premium_charts_age_idx on public.premium_charts (age_min, age_max);

-- ============================================================
-- email_log: record of renewal reminders sent.
-- ============================================================
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  policy_id uuid references public.policies (id) on delete set null,
  to_email text not null,
  subject text,
  status text not null default 'sent',
  error text,
  sent_at timestamptz not null default now()
);
create index if not exists email_log_agent_idx on public.email_log (agent_id);

-- ============================================================
-- Helper: is the current user the admin?
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agents
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.agents enable row level security;
alter table public.clients enable row level security;
alter table public.policies enable row level security;
alter table public.premium_charts enable row level security;
alter table public.email_log enable row level security;

-- agents: a user can see/update their own row; admin can see/update all.
drop policy if exists agents_select_self on public.agents;
create policy agents_select_self on public.agents
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists agents_insert_self on public.agents;
create policy agents_insert_self on public.agents
  for insert with check (id = auth.uid());

drop policy if exists agents_update_self_or_admin on public.agents;
create policy agents_update_self_or_admin on public.agents
  for update using (id = auth.uid() or public.is_admin());

-- clients: owner-only (admin not given client access by default).
drop policy if exists clients_owner_all on public.clients;
create policy clients_owner_all on public.clients
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- policies: owner-only.
drop policy if exists policies_owner_all on public.policies;
create policy policies_owner_all on public.policies
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- premium_charts: everyone authenticated can read; only admin can write.
drop policy if exists premium_charts_read on public.premium_charts;
create policy premium_charts_read on public.premium_charts
  for select using (auth.uid() is not null);

drop policy if exists premium_charts_admin_write on public.premium_charts;
create policy premium_charts_admin_write on public.premium_charts
  for all using (public.is_admin()) with check (public.is_admin());

-- email_log: owner-only.
drop policy if exists email_log_owner_all on public.email_log;
create policy email_log_owner_all on public.email_log
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- ============================================================
-- Storage bucket for uploaded PDFs (private).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('policy-files', 'policy-files', false)
on conflict (id) do nothing;

-- Storage RLS: agents manage files under their own folder (agentId/...).
drop policy if exists "policy files owner read" on storage.objects;
create policy "policy files owner read" on storage.objects
  for select using (
    bucket_id = 'policy-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "policy files owner write" on storage.objects;
create policy "policy files owner write" on storage.objects
  for insert with check (
    bucket_id = 'policy-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "policy files owner delete" on storage.objects;
create policy "policy files owner delete" on storage.objects
  for delete using (
    bucket_id = 'policy-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
