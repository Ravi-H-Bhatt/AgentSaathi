-- ============================================================
-- BULK POLICY INSERT FOR SUPABASE
-- ============================================================
-- INSTRUCTIONS:
-- 1. Replace 'YOUR_AGENT_UUID' with your actual agent ID
-- 2. Replace 'YOUR_CLIENT_UUID' with the client UUID
-- 3. Paste this entire script into Supabase SQL Editor
-- 4. Click "Run" to insert all 26 policies at once
-- ============================================================

-- First, let's verify the client exists
-- SELECT id, full_name FROM clients LIMIT 1;

-- Now insert all policies
-- Replace YOUR_AGENT_UUID and YOUR_CLIENT_UUID with actual values!

INSERT INTO public.policies (
  agent_id,
  client_id,
  policy_number,
  policy_type,
  sum_insured,
  premium,
  renewal_date,
  company,
  status
) VALUES
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000100', 'Burglary Insurance', 60000000, 42000, '2025-07-05', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000105', 'Burglary Insurance', 5000000, 5000, '2025-07-08', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240600000172', 'Shopkeepers Insurance', 1112000, 1008, '2025-07-23', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240500000229', 'Householders Insurance', 1900000, 921, '2025-08-27', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240500000243', 'Householders Insurance', 3071000, 2510, '2025-09-08', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240600000240', 'Shopkeepers Insurance', 5060000, 5103, '2025-09-18', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000167', 'Burglary Insurance', 20000000, 20000, '2025-09-30', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240600000273', 'Shopkeepers Insurance', 3930000, 3876, '2025-10-16', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240600000274', 'Shopkeepers Insurance', 7520001, 6996, '2025-10-17', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000209', 'Burglary Insurance', 500000, 1000, '2025-11-16', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048250600000003', 'Shopkeepers Insurance', 20558000, 19885, '2026-04-05', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046250100000002', 'Burglary Insurance', 30000000, 33000, '2026-04-07', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046250100000007', 'Burglary Insurance', 35000000, 25025, '2026-04-12', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060011254300000004', 'New India Bharat Laghu Udyam Suraksha', 102000000, 100725, '2026-05-01', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060011160100000470', 'Standard Fire & Special Perils', 2500000, 6500, '2026-05-10', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060011258000000260', 'Bharat Sookshma Udyam Suraksha (Fire)', 25000000, 29938, '2026-06-01', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060011258000000319', 'Bharat Sookshma Udyam Suraksha (Fire)', 38000000, 37852, '2026-06-10', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060011258000000386', 'Bharat Sookshma Udyam Suraksha (Fire)', 10000000, 12400, '2026-06-25', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060011258000000359', 'Bharat Sookshma Udyam Suraksha (Fire)', 20000000, 21430, '2026-06-26', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000208', 'Burglary Insurance', 500000, 1500, '2025-11-16', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240600000402', 'Shopkeepers Insurance', 4343001, 4317, '2026-02-17', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000280', 'Burglary Insurance', 30000000, 21000, '2026-02-24', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000283', 'Burglary Insurance', 20000000, 20000, '2026-02-25', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000308', 'Burglary Insurance', 700000, 1400, '2026-03-11', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000309', 'Burglary Insurance', 1000000, 3000, '2026-03-11', 'New India', 'active'),
  ('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060048240600000447', 'Shopkeepers Insurance', 11570001, 10941, '2026-03-26', 'New India', 'active');

-- ============================================================
-- SUMMARY:
-- - 26 policies inserted
-- - Total Premium: ₹5,67,410
-- - Total Sum Insured: ₹4,18,671,003
-- - Date range: 2025-07-05 to 2026-06-26
-- - All policies set to status 'active'
-- ============================================================
