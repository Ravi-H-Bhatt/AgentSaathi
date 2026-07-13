-- ============================================================
-- 0008_agent_phone
-- Adds an optional phone number to agents. Used as the "(M)" mobile
-- number in mediclaim intimation email drafts. For colleagues, the
-- owning agent's phone is used.
-- Run in the Supabase SQL editor.
-- ============================================================

alter table public.agents add column if not exists phone text;
