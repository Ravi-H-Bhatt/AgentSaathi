-- 0010_workspace_and_delete_perm
-- Adds an independent "workspace" partition (home | lic) to clients, policies
-- and the activity log, so an agent can keep two fully separate dashboards
-- (their existing "Home" data and a fresh "LIC" set) that never mix.
--
-- All existing rows become 'home', so the current dashboard is untouched.
-- New uploads/clients are tagged with whichever workspace is active.
--
-- Also introduces an optional per-colleague "delete" permission (stored in the
-- existing agents.permissions JSON — no column change needed; missing = false).
--
-- Run in the Supabase SQL editor.

alter table public.clients
  add column if not exists workspace text not null default 'home';
alter table public.policies
  add column if not exists workspace text not null default 'home';
alter table public.activity_log
  add column if not exists workspace text not null default 'home';

-- Keep the two datasets independent and fast to query.
create index if not exists clients_agent_workspace_idx
  on public.clients (agent_id, workspace);
create index if not exists policies_agent_workspace_idx
  on public.policies (agent_id, workspace);
create index if not exists activity_log_owner_workspace_idx
  on public.activity_log (owner_id, workspace, created_at desc);
