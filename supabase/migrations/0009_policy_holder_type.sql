-- Add policy_holder_type column to policies table
-- Stores: Individual, Family, Floater, etc.
alter table public.policies add column if not exists policy_holder_type text;
