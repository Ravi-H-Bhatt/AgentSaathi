-- ============================================================
-- 0012_client_phone_manual
-- Tracks whether a client's phone number was entered MANUALLY (by the agent)
-- vs EXTRACTED from an uploaded policy. Manual numbers are editable in the UI;
-- extracted numbers stay fixed.
--
-- Run in the Supabase SQL editor.
-- ============================================================

alter table public.clients
  add column if not exists phone_manual boolean not null default false;
