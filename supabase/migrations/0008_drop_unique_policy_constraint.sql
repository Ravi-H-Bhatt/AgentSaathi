-- Drop the UNIQUE constraint on (agent_id, policy_number).
--
-- WHY: The same policy_number can legitimately appear multiple times with
-- DIFFERENT premiums, dates, or products (e.g. mid-term endorsements, or
-- multiple line-items sharing an insurer reference). The application now
-- deduplicates using a COMPOSITE key (policy_number + client + product +
-- premium + sum_insured + start_date + renewal_date) in the bulk import
-- route, so a DB-level unique constraint on policy_number alone is both
-- unnecessary and actively blocks valid records.
alter table public.policies
  drop constraint if exists policies_agent_policy_number_unique;
