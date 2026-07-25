-- Run this in Supabase SQL Editor to verify premium data and fix access issues

-- 1. Check if tables exist and have data
SELECT 'nia_mediclaim_individual' as table_name, COUNT(*) as row_count FROM nia_mediclaim_individual
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

-- 2. Test a sample query (age 30, zone1, 500000 SI) - should return a premium
SELECT * FROM nia_mediclaim_individual 
WHERE zone = 'zone1' 
AND age_min <= 30 
AND age_max >= 30 
AND sum_insured = 500000;

-- 3. Enable RLS but allow ALL authenticated users to read
ALTER TABLE nia_mediclaim_individual ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_mediclaim_floater ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_i ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_ii ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_iii ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_topup_mediclaim ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_config ENABLE ROW LEVEL SECURITY;

-- Create policies to allow ALL authenticated users to SELECT
DROP POLICY IF EXISTS "Allow authenticated users to read" ON nia_mediclaim_individual;
CREATE POLICY "Allow authenticated users to read" ON nia_mediclaim_individual FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read" ON nia_mediclaim_floater;
CREATE POLICY "Allow authenticated users to read" ON nia_mediclaim_floater FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read" ON nia_optional_cover_i;
CREATE POLICY "Allow authenticated users to read" ON nia_optional_cover_i FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read" ON nia_optional_cover_ii;
CREATE POLICY "Allow authenticated users to read" ON nia_optional_cover_ii FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read" ON nia_optional_cover_iii;
CREATE POLICY "Allow authenticated users to read" ON nia_optional_cover_iii FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read" ON nia_topup_mediclaim;
CREATE POLICY "Allow authenticated users to read" ON nia_topup_mediclaim FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read" ON premium_config;
CREATE POLICY "Allow authenticated users to read" ON premium_config FOR SELECT TO authenticated USING (true);

-- 4. Verify the policy works
SELECT COUNT(*) as "Should see data if policies work" FROM nia_mediclaim_individual;
