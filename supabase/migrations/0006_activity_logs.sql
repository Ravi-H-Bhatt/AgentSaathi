-- Update RLS policies to allow colleagues to view policies and clients
-- Colleagues can view policies/clients from their parent agent

drop policy if exists policies_owner_all on public.policies;
create policy policies_owner_all on public.policies
  for all 
  using (
    agent_id = auth.uid() 
    or agent_id in (
      select parent_agent_id from public.agents 
      where id = auth.uid() and parent_agent_id is not null
    )
  ) 
  with check (agent_id = auth.uid());

drop policy if exists clients_owner_all on public.clients;
create policy clients_owner_all on public.clients
  for all 
  using (
    agent_id = auth.uid()
    or agent_id in (
      select parent_agent_id from public.agents 
      where id = auth.uid() and parent_agent_id is not null
    )
  ) 
  with check (agent_id = auth.uid());

-- Admin can see all activity logs
drop policy if exists activity_log_admin_read on public.activity_log;
create policy activity_log_admin_read on public.activity_log
  for select using (public.is_admin());
