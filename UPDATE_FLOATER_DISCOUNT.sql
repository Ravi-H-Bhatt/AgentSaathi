-- ============================================================================
-- UPDATE FLOATER DISCOUNT PERCENTAGES
-- ============================================================================
-- Run this in Supabase SQL Editor to fix floater discount percentages
-- Current (WRONG): 0% for 2, 5% for 3, 10% for 4+
-- Correct: 5% for 2, 10% for 3, 15% for 4+
-- ============================================================================

UPDATE premium_config 
SET 
  value = '{"2": 5, "3": 10, "4": 15}'::jsonb,
  description = 'Family member discount percentages: 5% for 2, 10% for 3, 15% for 4+',
  updated_at = NOW()
WHERE key = 'floater_discount';

-- Verify the update
SELECT key, value, description FROM premium_config WHERE key = 'floater_discount';
