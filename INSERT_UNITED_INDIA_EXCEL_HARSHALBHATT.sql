-- United India Insurance Excel Import for Harshal Bhatt
-- 49 policies from New Microsoft Excel Worksheet (2) 2.xlsx
-- Agent UUID: d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7

BEGIN;

-- Insert 49 unique clients for Harshal Bhatt
INSERT INTO public.clients (agent_id, full_name, phone, workspace, created_at)
VALUES
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'DAKSHABEN ASHWINBHAI RAVAL', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'SMT. DEVIKABEN N. DESAI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'JOSHI NIMESHBHAI KANTILAL', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'DRUV NIMESH JOSHI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'GIRISHCHANDRA B. SHUKLA', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'JATIN C SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MIHIR M TRIVEDI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'VIVISHA MAHENDRA SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'POONAM P BHATT', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MAHESH B. THAKER', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'REKHABEN M.TRIVEDI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'RAMESH P PATEL', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'SAMIR J. DAVE', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MAHESH.S.SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'POPATLAL PATEL', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'SMT. SHAKUNTALABEN POPATLAL PATEL', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'NIPA V SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'PURVI.H.MEHTA', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'CHITRA NARENDRA GOPALANI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'RAKESH M JANI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'VYOMESHBHAI B. SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MINESH P SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'SHWETA HARSHAL BHATT', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'PAWAN KAKKAR', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'SAVITABEN CHANDULAL SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'JAIN MAHENDRA', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'KSHEMA AMIT DESAI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MURLIDHAR H. JETHWANI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'KIRITKUMAR G. DAVE', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MISHRIMAL A.SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'ROHIT D. DESAI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MR. YAGNESHBHAI C. SEVAK', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'VISHWAS SHARMA', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'JYOTSNA J MADIA', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MITHIBEN D. PARIKH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'SHAH VASUMATIBEN', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'ISHA C DESAI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'SMT. USHABEN C. DESAI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MODI NALINKUMAR HIRALAL', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'VILASBEN ANIL SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'NAINESH S SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'RATANBEN R SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'DARSHAN ENGINEER', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'PANKAJ PAREKH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'TRIVEDI NIRAV', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'ANAND.N.JAGTIANI', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'MR. VIPULBHAI SHAH', NULL, 'home', NOW()),
  ('d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid, 'RUPESHBHAI V SHAH', NULL, 'home', NOW())
ON CONFLICT DO NOTHING;

-- Insert 49 policies with correct data matching clients
INSERT INTO public.policies (
  agent_id, client_id, company, policy_type, product_name, policy_holder_type,
  policy_number, sum_insured, premium, mode, start_date, renewal_date, workspace, created_at
)
SELECT
  'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid,
  c.id,
  'United India Insurance',
  'Health Insurance',
  'Family Medicare Policy - Individual',
  'Individual',
  p.policy_no,
  p.sum_ins,
  p.premium,
  'Annual',
  p.start_dt,
  p.renewal_dt,
  'home',
  NOW()
FROM (
  VALUES
    ('0605002825P107058385', 'DAKSHABEN ASHWINBHAI RAVAL', 1000000, 46822.55, '2025-08-01'::date, '2026-08-01'::date),
    ('0605002825P107063244', 'SMT. DEVIKABEN N. DESAI', 1000000, 41479.42, '2025-08-04'::date, '2026-08-04'::date),
    ('0605002825P107150111', 'JOSHI NIMESHBHAI KANTILAL', 2000000, 74529.46, '2025-08-11'::date, '2026-08-11'::date),
    ('0605002825P107245525', 'DRUV NIMESH JOSHI', 1000000, 27084.95, '2025-08-11'::date, '2026-08-11'::date),
    ('0605002825P107476106', 'GIRISHCHANDRA B. SHUKLA', 500000, 19902, '2025-08-15'::date, '2026-08-15'::date),
    ('0605002825P107476451', 'JATIN C SHAH', 1500000, 84677.10, '2025-08-18'::date, '2026-08-18'::date),
    ('0605002825P108058535', 'MIHIR M TRIVEDI', 500000, 18575.00, '2025-08-24'::date, '2026-08-24'::date),
    ('0605002825P108124088', 'VIVISHA MAHENDRA SHAH', 1000000, 6748.75, '2025-09-17'::date, '2026-09-17'::date),
    ('0605002825P108766335', 'POONAM P BHATT', 1000000, 21119.00, '2025-09-04'::date, '2026-09-04'::date),
    ('0605002825P110623047', 'MAHESH B. THAKER', 1000000, 26570.00, '2025-10-02'::date, '2026-10-02'::date),
    ('0605002825P110623190', 'REKHABEN M.TRIVEDI', 1000000, 28109.00, '2025-10-08'::date, '2026-10-08'::date),
    ('0605002825P110790795', 'RAMESH P PATEL', 2500000, 82452.97, '2025-10-09'::date, '2026-10-09'::date),
    ('0605002825P110886274', 'SAMIR J. DAVE', 2500000, 92596.50, '2025-10-22'::date, '2026-10-22'::date),
    ('0605002825P110886568', 'MAHESH.S.SHAH', 1500000, 49852.20, '2025-10-07'::date, '2026-10-07'::date),
    ('0605002825P110886763', 'POPATLAL PATEL', 1000000, 39353.00, '2025-10-14'::date, '2026-10-14'::date),
    ('0605002825P110887725', 'SMT. SHAKUNTALABEN POPATLAL PATEL', 1000000, 39353.00, '2025-10-14'::date, '2026-10-14'::date),
    ('0605002825P110973539', 'NIPA V SHAH', 1500000, 25342.00, '2025-10-10'::date, '2026-10-10'::date),
    ('0605002825P111028072', 'PURVI.H.MEHTA', 1500000, 25342.00, '2025-10-14'::date, '2026-10-14'::date),
    ('0605002825P111033327', 'CHITRA NARENDRA GOPALANI', 1000000, 25899.00, '2025-10-12'::date, '2026-10-12'::date),
    ('0605002825P111064065', 'RAKESH M JANI', 2000000, 52470.40, '2025-10-20'::date, '2026-10-20'::date),
    ('0605002825P111276807', 'VYOMESHBHAI B. SHAH', 1000000, 21931.00, '2025-10-25'::date, '2026-10-25'::date),
    ('0605002825P111277469', 'MINESH P SHAH', 1500000, 26882.15, '2025-10-24'::date, '2026-10-24'::date),
    ('0605002825P111311674', 'SHWETA HARSHAL BHATT', 500000, 4048.00, '2025-10-29'::date, '2026-10-29'::date),
    ('0605002825P111341133', 'PAWAN KAKKAR', 1500000, 25342.00, '2025-10-28'::date, '2026-10-28'::date),
    ('0605002825P112378463', 'SAVITABEN CHANDULAL SHAH', 1000000, 16866.00, '2025-11-26'::date, '2026-11-26'::date),
    ('0605002825P112390204', 'JAIN MAHENDRA', 2000000, 49698.30, '2025-11-04'::date, '2026-11-04'::date),
    ('0605002825P112434154', 'KSHEMA AMIT DESAI', 1500000, 41752.70, '2025-12-01'::date, '2026-12-01'::date),
    ('0605002825P112589990', 'MURLIDHAR H. JETHWANI', 1000000, 32943.15, '2025-11-07'::date, '2026-11-07'::date),
    ('0605002825P112590228', 'KIRITKUMAR G. DAVE', 2500000, 74208.30, '2025-11-09'::date, '2026-11-09'::date),
    ('0605002825P112768987', 'POPATLAL PATEL', 1000000, 39353.00, '2025-11-08'::date, '2026-11-08'::date),
    ('0605002825P112769403', 'MISHRIMAL A.SHAH', 2000000, 64816.60, '2025-11-20'::date, '2026-11-20'::date),
    ('0605002825P112769924', 'ROHIT D. DESAI', 2000000, 61418.45, '2025-11-29'::date, '2026-11-29'::date),
    ('0605002825P112891050', 'MR. YAGNESHBHAI C. SEVAK', 1500000, 44442.42, '2025-11-14'::date, '2026-11-14'::date),
    ('0605002825P112933591', 'VISHWAS SHARMA', 1500000, 24190.40, '2025-11-28'::date, '2026-11-28'::date),
    ('0605002825P113127818', 'JYOTSNA J MADIA', 1000000, 23392.80, '2025-11-21'::date, '2026-11-21'::date),
    ('0605002825P113766713', 'MITHIBEN D. PARIKH', 2500000, 99706.30, '2025-12-07'::date, '2026-12-07'::date),
    ('0605002825P113813338', 'SHAH VASUMATIBEN', 1500000, 48805.00, '2025-12-07'::date, '2026-12-07'::date),
    ('0605002825P113899206', 'ISHA C DESAI', 500000, 7852.50, '2025-12-14'::date, '2026-12-14'::date),
    ('0605002825P113899820', 'SMT. USHABEN C. DESAI', 1000000, 22488.00, '2025-12-14'::date, '2026-12-14'::date),
    ('0605002825P113943076', 'MODI NALINKUMAR HIRALAL', 1000000, 21513.20, '2025-12-04'::date, '2026-12-04'::date),
    ('0605002825P114184130', 'VILASBEN ANIL SHAH', 1500000, 48735.00, '2025-12-15'::date, '2026-12-15'::date),
    ('0605002825P114244410', 'NAINESH S SHAH', 1500000, 25330.80, '2025-12-13'::date, '2026-12-13'::date),
    ('0605002825P114452581', 'RATANBEN R SHAH', 1500000, 45079.00, '2025-12-27'::date, '2026-12-27'::date),
    ('0605002825P114453378', 'DARSHAN ENGINEER', 1000000, 32677.15, '2025-12-16'::date, '2026-12-16'::date),
    ('0605002825P114453919', 'PANKAJ PAREKH', 1500000, 30078.75, '2025-12-28'::date, '2026-12-28'::date),
    ('0605002825P114530592', 'TRIVEDI NIRAV', 1000000, 18999.00, '2025-12-20'::date, '2026-12-20'::date),
    ('0605002825P114640580', 'ANAND.N.JAGTIANI', 2000000, 63890.44, '2025-12-22'::date, '2026-12-22'::date),
    ('0605002825P115023067', 'MR. VIPULBHAI SHAH', 2500000, 77065.90, '2026-01-05'::date, '2027-01-05'::date),
    ('0605002825P115023425', 'RUPESHBHAI V SHAH', 2000000, 49016.43, '2025-12-29'::date, '2026-12-29'::date)
) p(policy_no, client_name, sum_ins, premium, start_dt, renewal_dt)
INNER JOIN public.clients c ON 
  c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid AND 
  LOWER(TRIM(c.full_name)) = LOWER(TRIM(p.client_name));

COMMIT;

-- Verify insertion
SELECT COUNT(*) as total_clients FROM public.clients 
WHERE agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid;

SELECT COUNT(*) as total_policies FROM public.policies 
WHERE agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid
AND company = 'United India Insurance';
