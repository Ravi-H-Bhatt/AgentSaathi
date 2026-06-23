-- Add UNIQUE constraint for policy deduplication
-- Prevents duplicate policies (same policy_number) being created for the same agent
-- Null policy_numbers are allowed (for policies without explicit numbers)
alter table public.policies 
add constraint policies_agent_policy_number_unique 
unique(agent_id, policy_number) where policy_number is not null;
