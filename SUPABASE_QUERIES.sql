-- ============================================================
-- SUPABASE QUERIES FOR HARSHAL BHATT DATA EXPORT
-- ============================================================
-- Copy these queries into Supabase SQL Editor and run them
-- Then export results to CSV and open in Excel
-- ============================================================

-- STEP 1: Find the Agent ID for Harshal Bhatt
-- Copy the UUID and use it in the queries below
-- ============================================================

SELECT id, full_name, email 
FROM public.agents 
WHERE lower(full_name) LIKE '%harshal%bhatt%' 
   OR lower(email) LIKE '%harshal%';

-- Result: Copy the ID (UUID format)
-- Example: d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7


-- ============================================================
-- QUERY A: ALL CLIENTS OF HARSHAL BHATT (any company)
-- ============================================================
-- Shows 1900+ policies from all companies
-- Use this to get ALL clients for Harshal Bhatt
-- ============================================================

SELECT DISTINCT
  c.id,
  c.full_name AS "Client Name",
  c.email AS "Email",
  c.phone AS "Current Phone",
  COUNT(p.id) AS "Policy Count"
FROM public.clients c
LEFT JOIN public.policies p ON c.id = p.client_id
WHERE c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'  -- REPLACE WITH ACTUAL AGENT ID
GROUP BY c.id, c.full_name, c.email, c.phone
ORDER BY c.full_name;


-- ============================================================
-- QUERY B: ONLY LIC CLIENTS OF HARSHAL BHATT
-- ============================================================
-- Shows only LIC insurance policies (~1100 policies)
-- Use this if you only want to update LIC clients
-- ============================================================

SELECT DISTINCT
  c.id,
  c.full_name AS "Client Name",
  c.email AS "Email",
  c.phone AS "Current Phone",
  p.company AS "Company",
  COUNT(p.id) AS "Policy Count"
FROM public.clients c
LEFT JOIN public.policies p ON c.id = p.client_id
WHERE c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'  -- REPLACE WITH ACTUAL AGENT ID
  AND p.company = 'LIC'
GROUP BY c.id, c.full_name, c.email, c.phone, p.company
ORDER BY c.full_name;


-- ============================================================
-- QUERY C: ONLY HOME INSURANCE CLIENTS (NOT LIC)
-- ============================================================
-- Shows all non-LIC home insurance policies (~800 policies)
-- Use this if you only want to update home insurance clients
-- ============================================================

SELECT DISTINCT
  c.id,
  c.full_name AS "Client Name",
  c.email AS "Email",
  c.phone AS "Current Phone",
  p.company AS "Company",
  COUNT(p.id) AS "Policy Count"
FROM public.clients c
LEFT JOIN public.policies p ON c.id = p.client_id
WHERE c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'  -- REPLACE WITH ACTUAL AGENT ID
  AND (p.company IS NULL OR p.company != 'LIC')
GROUP BY c.id, c.full_name, c.email, c.phone, p.company
ORDER BY c.full_name;


-- ============================================================
-- QUERY D: SPECIFIC COMPANY (e.g., New India)
-- ============================================================
-- Shows policies for a specific company only
-- Change 'New India' to any company name you want
-- ============================================================

SELECT DISTINCT
  c.id,
  c.full_name AS "Client Name",
  c.email AS "Email",
  c.phone AS "Current Phone",
  p.company AS "Company",
  COUNT(p.id) AS "Policy Count"
FROM public.clients c
LEFT JOIN public.policies p ON c.id = p.client_id
WHERE c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'  -- REPLACE WITH ACTUAL AGENT ID
  AND p.company = 'New India'  -- CHANGE TO ANY COMPANY
GROUP BY c.id, c.full_name, c.email, c.phone, p.company
ORDER BY c.full_name;


-- ============================================================
-- QUERY E: DIRECT UPDATE (if you have SQL access only)
-- ============================================================
-- Update mobile numbers directly in database
-- Format: (Client Name, Mobile, Email)
-- ============================================================

UPDATE public.clients c
SET 
  phone = CASE 
    WHEN cm.phone IS NOT NULL THEN cm.phone 
    ELSE c.phone 
  END,
  email = CASE 
    WHEN cm.email IS NOT NULL THEN cm.email 
    ELSE c.email 
  END
FROM (
  VALUES 
    ('Aakash Jaykumar Shah', '9512039766', 'aakash@email.com'),
    ('Abhay Rameshchandra Shah', '9376115120', NULL),
    ('Ajay Ramanlal Patel', '9979765331', 'ajay@example.com')
    -- ADD MORE ROWS HERE IN SAME FORMAT
) AS cm(name, phone, email)
WHERE LOWER(c.full_name) = LOWER(cm.name)
  AND c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7';  -- REPLACE WITH ACTUAL AGENT ID


-- ============================================================
-- TIPS
-- ============================================================
-- 1. Always replace 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7' with actual agent ID
-- 2. Export results to CSV: Click "Export to CSV" after running query
-- 3. Open in Excel and fill in mobile numbers
-- 4. Upload via the Update Mobile Numbers page
-- 5. For direct SQL updates, be very careful with formatting
-- ============================================================
