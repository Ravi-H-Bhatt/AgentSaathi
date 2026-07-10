-- ============================================================
-- RUN THIS SQL IN SUPABASE DASHBOARD → SQL EDITOR
-- This creates the missing tables needed for error reporting
-- ============================================================

-- Create error_reports table
create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.agents (id) on delete cascade,
  reporter_name text,
  reporter_email text,
  owner_id uuid references public.agents (id) on delete set null,
  message text not null,
  page text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists error_reports_status_idx on public.error_reports (status, created_at desc);
create index if not exists error_reports_reporter_idx on public.error_reports (reporter_id);

-- Enable RLS
alter table public.error_reports enable row level security;

-- RLS Policies
drop policy if exists error_reports_insert_agent on public.error_reports;
create policy error_reports_insert_agent on public.error_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists error_reports_read_own on public.error_reports;
create policy error_reports_read_own on public.error_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists error_reports_admin_all on public.error_reports;
create policy error_reports_admin_all on public.error_reports
  for all using (public.is_admin()) with check (public.is_admin());

-- Create email_drafts table (if not exists)
create table if not exists public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  policy_id uuid references public.policies (id) on delete set null,
  client_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'discarded')),
  created_at timestamptz not null default now()
);

create index if not exists email_drafts_agent_idx on public.email_drafts (agent_id, created_at desc);

-- Enable RLS
alter table public.email_drafts enable row level security;

drop policy if exists email_drafts_owner_all on public.email_drafts;
create policy email_drafts_owner_all on public.email_drafts
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- ============================================================
-- VERIFICATION: Check tables were created
-- ============================================================
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('error_reports', 'email_drafts')
ORDER BY table_name;

-- Should return:
-- error_reports | 8
-- email_drafts  | 7

