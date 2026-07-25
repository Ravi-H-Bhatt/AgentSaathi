-- ============================================================
-- QUICK CLEANUP: Delete Clients with 0 Policies
-- Copy and paste these queries one at a time in Supabase SQL Editor
-- ============================================================

-- 1️⃣ CHECK: How many clients have 0 policies?
-- (SAFE - Read Only)
SELECT 
  COUNT(*) AS total_zero_policy_clients
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.policies p 
  WHERE p.client_id = c.id
);


-- 2️⃣ VIEW: See the list before deleting
-- (SAFE - Read Only)
SELECT 
  c.full_name,
  c.email,
  c.phone,
  c.created_at
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.policies p 
  WHERE p.client_id = c.id
)
ORDER BY c.created_at DESC;


-- 3️⃣ DELETE: Remove clients with 0 policies
-- ⚠️ WARNING: CANNOT BE UNDONE!
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


-- 4️⃣ VERIFY: Confirm deletion
-- (SAFE - Read Only)
SELECT 
  COUNT(*) AS remaining_zero_policy_clients
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.policies p 
  WHERE p.client_id = c.id
);


-- ============================================================
-- Expected Results:
-- ============================================================
--
-- Before DELETE:
-- Query 1: total_zero_policy_clients = 15 (example)
--
-- After DELETE:
-- Query 3: "DELETE 15" (shows how many deleted)
-- Query 4: remaining_zero_policy_clients = 0
--
-- ============================================================
