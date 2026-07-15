-- ============================================================
-- CLEANUP AND FIX - Run this in Supabase SQL Editor
-- ============================================================

-- 1. Delete clients with no policies (orphaned from failed import)
DELETE FROM public.clients 
WHERE id IN (
  SELECT c.id 
  FROM public.clients c 
  LEFT JOIN public.policies p ON p.client_id = c.id 
  WHERE p.id IS NULL
);

-- 2. Add policy_holder_type column (stores Individual/Family/Floater)
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS policy_holder_type TEXT;

-- 3. Drop the blocking constraint (allows same policy number with different details)
ALTER TABLE public.policies DROP CONSTRAINT IF EXISTS policies_agent_policy_number_unique;

-- ============================================================
-- VERIFICATION - Check results
-- ============================================================

-- Check clients deleted
SELECT 'Clients with 0 policies remaining:' as check_name, COUNT(*) as count
FROM public.clients c 
LEFT JOIN public.policies p ON p.client_id = c.id 
WHERE p.id IS NULL;

-- Check column exists
SELECT 'policy_holder_type column exists:' as check_name, 
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM information_schema.columns 
WHERE table_name = 'policies' AND column_name = 'policy_holder_type';

-- Check constraint dropped
SELECT 'Blocking constraint exists:' as check_name, 
       CASE WHEN COUNT(*) > 0 THEN 'ERROR - Still exists!' ELSE 'OK - Dropped' END as result
FROM pg_constraint 
WHERE conname = 'policies_agent_policy_number_unique';
