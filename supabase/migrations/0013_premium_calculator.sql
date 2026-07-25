-- Premium Calculator Tables for New India Assurance
-- These tables store exact premium values from official premium charts

-- 1. New India Mediclaim (Individual) Premium Table
CREATE TABLE IF NOT EXISTS nia_mediclaim_individual (
  id BIGSERIAL PRIMARY KEY,
  zone TEXT NOT NULL, -- 'zone1' or 'zone2'
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  sum_insured BIGINT NOT NULL,
  premium INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone, age_min, age_max, sum_insured)
);

-- Index for fast lookups
CREATE INDEX idx_nia_individual_lookup ON nia_mediclaim_individual(zone, age_min, age_max, sum_insured);

-- 2. New India Floater Mediclaim Premium Table
CREATE TABLE IF NOT EXISTS nia_mediclaim_floater (
  id BIGSERIAL PRIMARY KEY,
  zone TEXT NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  sum_insured BIGINT NOT NULL,
  premium INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone, age_min, age_max, sum_insured)
);

CREATE INDEX idx_nia_floater_lookup ON nia_mediclaim_floater(zone, age_min, age_max, sum_insured);

-- 3. Optional Cover I - No Proportionate Deduction
CREATE TABLE IF NOT EXISTS nia_optional_cover_i (
  id BIGSERIAL PRIMARY KEY,
  sum_insured BIGINT NOT NULL,
  age_band TEXT NOT NULL, -- '<35', '36-45', '46-50', '51-55', '56-60', '61-65', '>65'
  premium INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sum_insured, age_band)
);

CREATE INDEX idx_optional_i_lookup ON nia_optional_cover_i(sum_insured, age_band);

-- 4. Optional Cover II - Maternity Benefit
CREATE TABLE IF NOT EXISTS nia_optional_cover_ii (
  id BIGSERIAL PRIMARY KEY,
  sum_insured BIGINT NOT NULL UNIQUE,
  premium INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Optional Cover III - Revision in Cataract Limit
CREATE TABLE IF NOT EXISTS nia_optional_cover_iii (
  id BIGSERIAL PRIMARY KEY,
  sum_insured BIGINT NOT NULL,
  age_band TEXT NOT NULL,
  premium INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sum_insured, age_band)
);

CREATE INDEX idx_optional_iii_lookup ON nia_optional_cover_iii(sum_insured, age_band);

-- 6. Optional Cover V - Non-Medical Items (Consumables)
-- Fixed premium of Rs. 1500 for SI >= 8L, stored as a constant

-- 7. New India Top-Up Mediclaim Premium Table
CREATE TABLE IF NOT EXISTS nia_topup_mediclaim (
  id BIGSERIAL PRIMARY KEY,
  threshold BIGINT NOT NULL,
  sum_insured BIGINT NOT NULL,
  member_type TEXT NOT NULL, -- 'primary' or 'additional'
  age_band TEXT NOT NULL, -- '<20', '21-25', '26-30', '31-35', '36-40', '41-45', '46-50', '51-55', '56-60', '61-65', '66-70'
  premium INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(threshold, sum_insured, member_type, age_band)
);

CREATE INDEX idx_topup_lookup ON nia_topup_mediclaim(threshold, sum_insured, member_type, age_band);

-- 8. Premium Configuration (stores rules and constants)
CREATE TABLE IF NOT EXISTS premium_config (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert configuration rules
INSERT INTO premium_config (key, value, description) VALUES
('floater_discount', '{"2": 5, "3": 10, "4": 15}', 'Family member discount percentages: 5% for 2, 10% for 3, 15% for 4+'),
('long_term_discount', '{"1": 0, "2": 5, "3": 7}', 'Long term policy discount by year'),
('voluntary_copay_discount', '15', 'Discount for 20% voluntary co-pay'),
('optional_cover_v_premium', '1500', 'Fixed premium for non-medical items cover'),
('optional_cover_v_min_si', '800000', 'Minimum SI for Optional Cover V eligibility')
ON CONFLICT (key) DO NOTHING;

-- Function to get age band for optional covers
CREATE OR REPLACE FUNCTION get_age_band(age INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN age < 35 THEN '<35'
    WHEN age BETWEEN 36 AND 45 THEN '36-45'
    WHEN age BETWEEN 46 AND 50 THEN '46-50'
    WHEN age BETWEEN 51 AND 55 THEN '51-55'
    WHEN age BETWEEN 56 AND 60 THEN '56-60'
    WHEN age BETWEEN 61 AND 65 THEN '61-65'
    WHEN age >= 66 THEN '>65'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get age band for top-up
CREATE OR REPLACE FUNCTION get_topup_age_band(age INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN age < 20 THEN '<20'
    WHEN age BETWEEN 21 AND 25 THEN '21-25'
    WHEN age BETWEEN 26 AND 30 THEN '26-30'
    WHEN age BETWEEN 31 AND 35 THEN '31-35'
    WHEN age BETWEEN 36 AND 40 THEN '36-40'
    WHEN age BETWEEN 41 AND 45 THEN '41-45'
    WHEN age BETWEEN 46 AND 50 THEN '46-50'
    WHEN age BETWEEN 51 AND 55 THEN '51-55'
    WHEN age BETWEEN 56 AND 60 THEN '56-60'
    WHEN age BETWEEN 61 AND 65 THEN '61-65'
    WHEN age BETWEEN 66 AND 70 THEN '66-70'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nia_mediclaim_individual_updated_at BEFORE UPDATE ON nia_mediclaim_individual
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nia_mediclaim_floater_updated_at BEFORE UPDATE ON nia_mediclaim_floater
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_premium_config_updated_at BEFORE UPDATE ON premium_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant access to authenticated users
GRANT SELECT ON nia_mediclaim_individual TO authenticated;
GRANT SELECT ON nia_mediclaim_floater TO authenticated;
GRANT SELECT ON nia_optional_cover_i TO authenticated;
GRANT SELECT ON nia_optional_cover_ii TO authenticated;
GRANT SELECT ON nia_optional_cover_iii TO authenticated;
GRANT SELECT ON nia_topup_mediclaim TO authenticated;
GRANT SELECT ON premium_config TO authenticated;

-- Enable RLS for all premium tables
ALTER TABLE nia_mediclaim_individual ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_mediclaim_floater ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_i ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_ii ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_optional_cover_iii ENABLE ROW LEVEL SECURITY;
ALTER TABLE nia_topup_mediclaim ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_config ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE nia_mediclaim_individual IS 'Premium rates for New India Individual Mediclaim Policy';
COMMENT ON TABLE nia_mediclaim_floater IS 'Premium rates for New India Floater Mediclaim Policy';
COMMENT ON TABLE nia_optional_cover_i IS 'Premium for Optional Cover I - No Proportionate Deduction';
COMMENT ON TABLE nia_optional_cover_ii IS 'Premium for Optional Cover II - Maternity Benefit';
COMMENT ON TABLE nia_optional_cover_iii IS 'Premium for Optional Cover III - Revision in Cataract Limit';
COMMENT ON TABLE nia_topup_mediclaim IS 'Premium rates for New India Top-Up Mediclaim Policy';
COMMENT ON TABLE premium_config IS 'Configuration and rules for premium calculation';
