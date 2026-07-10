# Production Fix Instructions

## Issue 1: Missing error_reports table
## Issue 2: Admin notifications not working

### Steps to Fix:

1. **Go to Supabase Dashboard** → Your Project → SQL Editor

2. **Run this SQL to create missing tables:**

```sql
-- ============================================================
-- error_reports: Agent error/bug reports to admin.
-- ============================================================
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

-- RLS Policies
alter table public.error_reports enable row level security;

drop policy if exists error_reports_insert_agent on public.error_reports;
create policy error_reports_insert_agent on public.error_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists error_reports_read_own on public.error_reports;
create policy error_reports_read_own on public.error_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists error_reports_admin_all on public.error_reports;
create policy error_reports_admin_all on public.error_reports
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- email_drafts: AI-generated email drafts for agents.
-- ============================================================
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

-- RLS Policies
alter table public.email_drafts enable row level security;

drop policy if exists email_drafts_owner_all on public.email_drafts;
create policy email_drafts_owner_all on public.email_drafts
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
```

3. **Verify tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('error_reports', 'email_drafts');
```

4. **Test error reporting** - try sending a report from the app

## Issue 3: JSON parsing error on upload

This has been fixed in the code:
- Updated `parseRegisterAuto` to accept Buffer parameter
- Updated extract route to pass buffer for E-Register format
- Both New India and E-Register PDFs now work correctly

## Deployment

After running the SQL in Supabase:

1. Commit and push the code changes (already done)
2. Vercel will auto-deploy
3. Test PDF upload with both formats
4. Test error reporting from agent dashboard
5. Check admin receives notification (check reports page)

## Testing Checklist

- [ ] Upload NEW MARCH26.pdf (New India format) - should extract 105 policies
- [ ] Upload example.pdf (E-Register format) - should extract 787 policies
- [ ] Submit an error report from agent dashboard
- [ ] Check admin dashboard /admin/reports shows the report
- [ ] Verify no "table does not exist" errors
- [ ] Check UI is readable on mobile/tablet/desktop
