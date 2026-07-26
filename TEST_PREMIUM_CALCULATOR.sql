-- ============================================================================
-- COMPREHENSIVE PREMIUM CALCULATOR TEST QUERIES
-- ============================================================================
-- These are READ-ONLY queries to verify data exists and logic works
-- NO DESTRUCTIVE OPERATIONS - Safe to run on production data
-- ============================================================================

-- ===========================================================================
-- TEST CASE 1: INDIVIDUAL MEDICLAIM - Single Member
-- ===========================================================================
-- Scenario: 30-year-old, Sum Insured 10L, Zone 1
-- Expected: Should return valid premium

SELECT 
  'TEST 1: Individual - Single Member' as test_case,
  zone,
  age_min,
  age_max,
  sum_insured,
  premium
FROM nia_mediclaim_individual
WHERE zone = 'zone1'
  AND age_min <= 30
  AND age_max >= 30
  AND sum_insured = 1000000;

-- Expected result: Should show premium (e.g., ~7,636 for age 30)


-- ===========================================================================
-- TEST CASE 2: INDIVIDUAL MEDICLAIM - Multiple Members (Different Ages & SI)
-- ===========================================================================
-- Scenario: 
--   Member 1: Age 30, SI 10L
--   Member 2: Age 40, SI 5L
--   Member 3: Age 10, SI 3L
-- Expected: Should return 3 separate premiums (NOT added up)

SELECT 
  'TEST 2a: Individual Member 1 (Age 30, SI 10L)' as test_case,
  premium
FROM nia_mediclaim_individual
WHERE zone = 'zone1'
  AND age_min <= 30
  AND age_max >= 30
  AND sum_insured = 1000000;

SELECT 
  'TEST 2b: Individual Member 2 (Age 40, SI 5L)' as test_case,
  premium
FROM nia_mediclaim_individual
WHERE zone = 'zone1'
  AND age_min <= 40
  AND age_max >= 40
  AND sum_insured = 500000;

SELECT 
  'TEST 2c: Individual Member 3 (Age 10, SI 3L)' as test_case,
  premium
FROM nia_mediclaim_individual
WHERE zone = 'zone1'
  AND age_min <= 10
  AND age_max >= 10
  AND sum_insured = 300000;


-- ===========================================================================
-- TEST CASE 3: FLOATER MEDICLAIM - Family with Multiple Ages
-- ===========================================================================
-- Scenario:
--   Member 1: Age 35
--   Member 2: Age 32
--   Member 3: Age 5
--   Sum Insured: 10L (SHARED by all)
--   Zone: Zone 1
-- Expected: 3 individual premiums that ADD UP, then family discount applies

SELECT 
  'TEST 3: Floater - All Members' as test_case,
  age_min as age,
  premium,
  sum_insured
FROM nia_mediclaim_floater
WHERE zone = 'zone1'
  AND sum_insured = 1000000
  AND (
    (age_min <= 35 AND age_max >= 35) OR
    (age_min <= 32 AND age_max >= 32) OR
    (age_min <= 5 AND age_max >= 5)
  )
ORDER BY age_min DESC;

-- Calculate expected total
WITH member_premiums AS (
  SELECT 
    age_min as age,
    premium
  FROM nia_mediclaim_floater
  WHERE zone = 'zone1'
    AND sum_insured = 1000000
    AND (
      (age_min <= 35 AND age_max >= 35) OR
      (age_min <= 32 AND age_max >= 32) OR
      (age_min <= 5 AND age_max >= 5)
    )
)
SELECT 
  'TEST 3: Floater Base Premium (Before Discount)' as calculation,
  SUM(premium) as total_base_premium,
  ROUND(SUM(premium) * 0.10) as family_discount_10_percent,
  SUM(premium) - ROUND(SUM(premium) * 0.10) as final_premium_after_discount
FROM member_premiums;

-- Expected: Base premium ~21,000, 10% discount for 3 members = ~18,900


-- ===========================================================================
-- TEST CASE 4: FLOATER MEDICLAIM - Error Case (Age 30, SI 10L)
-- ===========================================================================
-- This is the case that was failing before
-- Scenario: Age 30, Sum Insured 10L, Zone 1
-- Expected: Should return valid premium

SELECT 
  'TEST 4: Floater - Age 30 SI 10L (Previously Failing)' as test_case,
  zone,
  age_min,
  age_max,
  sum_insured,
  premium
FROM nia_mediclaim_floater
WHERE zone = 'zone1'
  AND age_min <= 30
  AND age_max >= 30
  AND sum_insured = 1000000;

-- Expected result: premium = 7636 (from PDF)


-- ===========================================================================
-- TEST CASE 5: TOP-UP MEDICLAIM - Primary vs Additional Members
-- ===========================================================================
-- Scenario:
--   Member 1 (Eldest/Primary): Age 47, Band 45-54
--   Member 2 (Additional): Age 35, Band 18-44
--   Member 3 (Additional): Age 32, Band 18-44
--   Threshold: 8L, Sum Insured: 12L

-- Primary Member
SELECT 
  'TEST 5a: Top-Up PRIMARY Member (Age 47)' as test_case,
  member_type,
  age_band,
  threshold,
  sum_insured,
  premium
FROM nia_topup_mediclaim
WHERE threshold = 800000
  AND sum_insured = 1200000
  AND member_type = 'primary'
  AND age_band = '45-54';

-- Additional Members
SELECT 
  'TEST 5b: Top-Up ADDITIONAL Members (Age 35, 32)' as test_case,
  member_type,
  age_band,
  threshold,
  sum_insured,
  premium
FROM nia_topup_mediclaim
WHERE threshold = 800000
  AND sum_insured = 1200000
  AND member_type = 'additional'
  AND age_band = '18-44';

-- Calculate total
WITH topup_premiums AS (
  SELECT premium FROM nia_topup_mediclaim
  WHERE threshold = 800000 AND sum_insured = 1200000 AND member_type = 'primary' AND age_band = '45-54'
  UNION ALL
  SELECT premium FROM nia_topup_mediclaim
  WHERE threshold = 800000 AND sum_insured = 1200000 AND member_type = 'additional' AND age_band = '18-44'
  UNION ALL
  SELECT premium FROM nia_topup_mediclaim
  WHERE threshold = 800000 AND sum_insured = 1200000 AND member_type = 'additional' AND age_band = '18-44'
)
SELECT 
  'TEST 5c: Top-Up Total Premium' as calculation,
  SUM(premium) as total_premium
FROM topup_premiums;


-- ===========================================================================
-- VERIFICATION: Check all required data exists
-- ===========================================================================

-- Check Individual Mediclaim data coverage
SELECT 
  'Individual Mediclaim Data Coverage' as check_type,
  zone,
  COUNT(DISTINCT sum_insured) as sum_insured_count,
  MIN(age_min) as min_age,
  MAX(age_max) as max_age,
  COUNT(*) as total_rows
FROM nia_mediclaim_individual
GROUP BY zone;

-- Check Floater Mediclaim data coverage
SELECT 
  'Floater Mediclaim Data Coverage' as check_type,
  zone,
  COUNT(DISTINCT sum_insured) as sum_insured_count,
  MIN(age_min) as min_age,
  MAX(age_max) as max_age,
  COUNT(*) as total_rows
FROM nia_mediclaim_floater
GROUP BY zone;

-- Check Top-Up Mediclaim data coverage
SELECT 
  'Top-Up Mediclaim Data Coverage' as check_type,
  member_type,
  COUNT(DISTINCT threshold) as threshold_count,
  COUNT(DISTINCT sum_insured) as sum_insured_count,
  COUNT(DISTINCT age_band) as age_band_count,
  COUNT(*) as total_rows
FROM nia_topup_mediclaim
GROUP BY member_type;

-- Check Optional Covers data
SELECT 
  'Optional Cover I Data' as check_type,
  COUNT(DISTINCT sum_insured) as sum_insured_count,
  COUNT(DISTINCT age_band) as age_band_count,
  COUNT(*) as total_rows
FROM nia_optional_cover_i;

SELECT 
  'Optional Cover II Data' as check_type,
  COUNT(DISTINCT sum_insured) as sum_insured_count,
  COUNT(*) as total_rows
FROM nia_optional_cover_ii;

SELECT 
  'Optional Cover III Data' as check_type,
  COUNT(DISTINCT sum_insured) as sum_insured_count,
  COUNT(DISTINCT age_band) as age_band_count,
  COUNT(*) as total_rows
FROM nia_optional_cover_iii;

-- Check Configuration
SELECT 
  'Premium Config' as check_type,
  key,
  value,
  description
FROM premium_config
ORDER BY key;


-- ===========================================================================
-- SUMMARY: Expected Results
-- ===========================================================================
/*
TEST 1: Should return premium ~7,636 for age 30, SI 10L
TEST 2: Should return 3 separate premiums (not added)
TEST 3: Should return 3 member premiums that add up, with 10% family discount
TEST 4: Should return premium 7,636 (this was previously failing)
TEST 5: Should return different rates for PRIMARY vs ADDITIONAL members

If any test returns NO ROWS, that data is missing from the database.
*/
