-- ============================================================
-- RUN THIS SQL IN SUPABASE DASHBOARD → SQL EDITOR
-- ============================================================

-- 📱 Agent phone number (used as the "(M)" mobile in intimation emails).
alter table public.agents add column if not exists phone text;

-- 🔧 Maintenance / "Work in Progress" mode toggle (single-row settings table)
create table if not exists public.app_settings (
  id boolean primary key default true,
  maintenance_mode boolean not null default false,
  maintenance_message text,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);
insert into public.app_settings (id, maintenance_mode)
values (true, false)
on conflict (id) do nothing;


-- ⚠️ URGENT FIX: Drop the unique constraint that blocks re-upload.
-- The app now deduplicates using a COMPOSITE key (policy_number + client
-- + product + premium + dates), so the same policy_number can legitimately
-- appear multiple times with different premiums/dates. This constraint was
-- causing: "duplicate key value violates unique constraint
-- policies_agent_policy_number_unique". Dropping it is SAFE — no data is
-- deleted, it only removes the blocking rule.
alter table public.policies
  drop constraint if exists policies_agent_policy_number_unique;

-- ============================================================
-- Error reporting + email drafts tables (safe to re-run)
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
-- VERIFICATION
-- ============================================================
-- Confirm the constraint is gone (should return 0 rows):
SELECT conname FROM pg_constraint
WHERE conname = 'policies_agent_policy_number_unique';

-- Confirm tables exist:
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('error_reports', 'email_drafts')
ORDER BY table_name;
