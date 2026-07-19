-- 0011_direct_messages
-- Adds 1:1 direct messaging to team_chat. A message with a recipient_id is a
-- private DM between sender_id and recipient_id; recipient_id NULL keeps the
-- existing team/group message behaviour. Existing rows stay group messages.
--
-- Run in the Supabase SQL editor. Safe to run multiple times.

alter table public.team_chat
  add column if not exists recipient_id uuid references public.agents (id) on delete cascade;

-- Fast lookup of a DM thread (both directions) and a recipient's inbox.
create index if not exists team_chat_dm_idx
  on public.team_chat (sender_id, recipient_id, created_at);
create index if not exists team_chat_recipient_idx
  on public.team_chat (recipient_id, created_at);

-- Allow reading a DM when you are the sender OR the recipient (in addition to
-- the existing team/group rules). API uses the service role, but this keeps
-- row-level security correct for any direct client access.
drop policy if exists team_chat_dm_read on public.team_chat;
create policy team_chat_dm_read on public.team_chat
  for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());
