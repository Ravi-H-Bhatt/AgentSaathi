-- STEP 1: First, let's ensure RLS policies are correct
-- Run this in Supabase SQL Editor

-- Enable RLS for all premium tables
ALTER TABLE nia_mediclaim_individual ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_mediclaim_floater ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_i ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_ii ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_iii ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_topup_mediclaim ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read premium data" ON nia_mediclaim_individual;
DROP POLICY IF EXISTS "Allow authenticated users to read premium data" ON nia_mediclaim_floater;
DROP POLICY IF EXISTS "Allow authenticated users to read premium data" ON nia_optional_cover_i;
DROP POLICY IF EXISTS "Allow authenticated users to read premium data" ON nia_optional_cover_ii;
DROP POLICY IF EXISTS "Allow authenticated users to read premium data" ON nia_optional_cover_iii;
DROP POLICY IF EXISTS "Allow authenticated users to read premium data" ON nia_topup_mediclaim;
DROP POLICY IF EXISTS "Allow authenticated users to read premium data" ON premium_config;

-- Create policies to allow ALL authenticated users to read premium data
CREATE POLICY "Allow authenticated users to read premium data" 
  ON nia_mediclaim_individual FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read premium data" 
  ON nia_mediclaim_floater FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read premium data" 
  ON nia_optional_cover_i FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read premium data" 
  ON nia_optional_cover_ii FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read premium data" 
  ON nia_optional_cover_iii FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read premium data" 
  ON nia_topup_mediclaim FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read premium data" 
  ON premium_config FOR SELECT TO authenticated USING (true);

-- STEP 2: Check if data exists
SELECT 
  'nia_mediclaim_individual' as table_name, 
  COUNT(*) as row_count 
FROM nia_mediclaim_individual
UNION ALL
SELECT 'nia_mediclaim_floater', COUNT(*) FROM nia_mediclaim_floater
UNION ALL
SELECT 'nia_optional_cover_i', COUNT(*) FROM nia_optional_cover_i
UNION ALL
SELECT 'nia_optional_cover_ii', COUNT(*) FROM nia_optional_cover_ii
UNION ALL
SELECT 'nia_optional_cover_iii', COUNT(*) FROM nia_optional_cover_iii
UNION ALL
SELECT 'nia_topup_mediclaim', COUNT(*) FROM nia_topup_mediclaim
UNION ALL
SELECT 'premium_config', COUNT(*) FROM premium_config;

-- STEP 3: If row_count is 0 for any table, you need to run complete_premium_data.sql next!
-- Otherwise, the premium calculator should work now!
