-- ============================================================
-- CLEANUP: Delete Clients with Zero Policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Check how many clients have 0 policies
SELECT 
  COUNT(*) AS total_zero_policy_clients
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.policies p 
  WHERE p.client_id = c.id
);

-- Step 2: View the list of clients with 0 policies (for verification)
SELECT 
  c.id,
  c.full_name,
  c.email,
  c.phone,
  c.agent_id,
  c.created_at,
  COUNT(p.id) AS policy_count
FROM public.clients c
LEFT JOIN public.policies p ON p.client_id = c.id
GROUP BY c.id, c.full_name, c.email, c.phone, c.agent_id, c.created_at
HAVING COUNT(p.id) = 0
ORDER BY c.created_at DESC;

-- Step 3: DELETE clients with 0 policies
-- WARNING: This cannot be undone!
DELETE FROM public.clients
WHERE id IN (
  SELECT c.id
  FROM public.clients c
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.policies p 
    WHERE p.client_id = c.id
  )
);

-- Step 4: Verify deletion
SELECT 
  COUNT(*) AS remaining_zero_policy_clients
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.policies p 
  WHERE p.client_id = c.id
);

-- ============================================================
-- Alternative: Delete for a specific agent only
-- ============================================================

-- Replace 'AGENT_ID_HERE' with actual agent UUID
DELETE FROM public.clients
WHERE agent_id = 'AGENT_ID_HERE'
AND id IN (
  SELECT c.id
  FROM public.clients c
  WHERE c.agent_id = 'AGENT_ID_HERE'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.policies p 
    WHERE p.client_id = c.id
  )
);

-- ============================================================
-- Bulk Cleanup: For all agents
-- ============================================================

-- This removes ALL clients with 0 policies across ALL agents
DELETE FROM public.clients
WHERE id IN (
  SELECT c.id
  FROM public.clients c
  LEFT JOIN public.policies p ON p.client_id = c.id
  GROUP BY c.id
  HAVING COUNT(p.id) = 0
);
