-- ============================================================================
-- FIX PREMIUM CALCULATOR DATABASE
-- ============================================================================
-- This script fixes the premium calculator to match the official PDF structure
-- 
-- KEY FIXES:
-- 1. Remove member_type from floater table (not used in New India Floater)
-- 2. Floater uses ELDEST AGE ONLY, not primary/additional logic
-- 3. Individual mediclaim should support multiple members independently
-- ============================================================================

-- Step 1: Drop the problematic queries that reference member_type in floater
-- The floater table DOES NOT have member_type column
-- Floater premium is based on ELDEST MEMBER AGE + SUM INSURED + ZONE only

-- Step 2: Verify floater table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nia_mediclaim_floater'
ORDER BY ordinal_position;

-- Expected columns: id, zone, age_min, age_max, sum_insured, premium, created_at, updated_at
-- NO member_type column!

-- Step 3: Test floater lookup for age 30, sum insured 10L, zone1
SELECT * FROM nia_mediclaim_floater
WHERE zone = 'zone1'
  AND age_min <= 30
  AND age_max >= 30
  AND sum_insured = 1000000;

-- Should return: premium = 7636 (from the PDF data)

-- Step 4: Check if we have data for common ages
SELECT 
  age_min,
  age_max,
  sum_insured,
  premium,
  zone
FROM nia_mediclaim_floater
WHERE zone = 'zone1'
  AND sum_insured = 1000000
  AND age_min >= 25
  AND age_max <= 35
ORDER BY age_min;

COMMENT ON TABLE nia_mediclaim_floater IS 
'Floater Mediclaim Premium Rates - Based on ELDEST MEMBER AGE ONLY. 
NO primary/additional member logic. 
All family members covered under single premium based on eldest age.';
