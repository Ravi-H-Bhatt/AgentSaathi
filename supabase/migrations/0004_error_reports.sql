-- Error / issue reports raised by agents or their colleagues, visible to admin.
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

alter table public.error_reports enable row level security;

-- Reporters can insert their own reports; admin can read/update all.
drop policy if exists error_reports_insert_self on public.error_reports;
create policy error_reports_insert_self on public.error_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists error_reports_admin_read on public.error_reports;
create policy error_reports_admin_read on public.error_reports
  for select using (public.is_admin() or reporter_id = auth.uid());

drop policy if exists error_reports_admin_update on public.error_reports;
create policy error_reports_admin_update on public.error_reports
  for update using (public.is_admin());
