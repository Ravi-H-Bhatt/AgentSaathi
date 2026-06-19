-- ============================================================
-- Migration: bulk policy register support
-- Run this in Supabase SQL Editor on an existing database.
-- Safe to run multiple times.
-- ============================================================

-- "Mode" = premium payment frequency (Mly/QLY/HLY/YLY/SGL) from LIC registers.
alter table public.policies add column if not exists mode text;

-- Dedup lookups during bulk import hit (agent_id, policy_number) a lot.
create index if not exists policies_number_idx
  on public.policies (agent_id, policy_number);
