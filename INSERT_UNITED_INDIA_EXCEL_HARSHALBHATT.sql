-- United India Insurance Excel Import for Harshal Bhatt
-- 49 policies from New Microsoft Excel Worksheet (2) 2.xlsx
-- Agent UUID: d5dc1226-0cf8-4ec4-bad5-acf8e182f0d7

BEGIN;

-- Insert 49 unique clients for Harshal Bhatt
INSERT INTO clients (agent_id, full_name, phone, workspace, created_at, updated_at)
SELECT DISTINCT
  'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid as agent_id,
  TRIM(client_name),
  NULL as phone,
  'default' as workspace,
  NOW(),
  NOW()
FROM (
  SELECT * FROM (
    VALUES
      ('DAKSHABEN ASHWINBHAI RAVAL'),
      ('SMT. DEVIKABEN N. DESAI'),
      ('JOSHI NIMESHBHAI KANTILAL'),
      ('DRUV NIMESH JOSHI'),
      ('GIRISHCHANDRA B. SHUKLA'),
      ('JATIN C SHAH'),
      ('MIHIR M TRIVEDI'),
      ('VIVISHA MAHENDRA SHAH'),
      ('POONAM P BHATT'),
      ('MAHESH B. THAKER'),
      ('REKHABEN M.TRIVEDI'),
      ('RAMESH P PATEL'),
      ('SAMIR J. DAVE'),
      ('MAHESH.S.SHAH'),
      ('POPATLAL PATEL'),
      ('SMT. SHAKUNTALABEN POPATLAL PATEL'),
      ('NIPA V SHAH'),
      ('PURVI.H.MEHTA'),
      ('CHITRA NARENDRA GOPALANI'),
      ('RAKESH M JANI'),
      ('VYOMESHBHAI B. SHAH'),
      ('MINESH P SHAH'),
      ('SHWETA HARSHAL BHATT'),
      ('PAWAN KAKKAR'),
      ('SAVITABEN CHANDULAL SHAH'),
      ('JAIN MAHENDRA'),
      ('KSHEMA AMIT DESAI'),
      ('MURLIDHAR H. JETHWANI'),
      ('KIRITKUMAR G. DAVE'),
      ('POPATLAL PATEL'),
      ('MISHRIMAL A.SHAH'),
      ('ROHIT D. DESAI'),
      ('MR. YAGNESHBHAI C. SEVAK'),
      ('VISHWAS SHARMA'),
      ('JYOTSNA J MADIA'),
      ('MITHIBEN D. PARIKH'),
      ('SHAH VASUMATIBEN'),
      ('ISHA C DESAI'),
      ('SMT. USHABEN C. DESAI'),
      ('MODI NALINKUMAR HIRALAL'),
      ('VILASBEN ANIL SHAH'),
      ('NAINESH S SHAH'),
      ('RATANBEN R SHAH'),
      ('DARSHAN ENGINEER'),
      ('PANKAJ PAREKH'),
      ('TRIVEDI NIRAV'),
      ('ANAND.N.JAGTIANI'),
      ('MR. VIPULBHAI SHAH'),
      ('RUPESHBHAI V SHAH')
  ) AS clients(client_name)
) client_list
ON CONFLICT (agent_id, full_name, workspace) DO NOTHING;

-- Now insert 49 policies linked to clients
INSERT INTO policies (
  agent_id,
  client_id,
  workspace,
  company,
  policy_type,
  product_name,
  policy_holder_type,
  policy_number,
  sum_insured,
  premium,
  mode,
  start_date,
  renewal_date,
  source_file_path,
  created_at,
  updated_at
)
SELECT
  'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid as agent_id,
  c.id as client_id,
  'default' as workspace,
  'United India Insurance' as company,
  'Health Insurance' as policy_type,
  CASE 
    WHEN policies.holder_type = 'Individual' THEN 'Family Medicare Policy - Individual'
    WHEN policies.holder_type = 'Floater' THEN 'Family Medicare Policy - Floater'
    ELSE 'Family Medicare Policy'
  END as product_name,
  policies.holder_type,
  policies.policy_no,
  policies.sum_ins,
  policies.prem,
  'Annual' as mode,
  policies.start_dt,
  policies.renew_dt,
  NULL as source_file_path,
  NOW(),
  NOW()
FROM (
  SELECT * FROM (
    VALUES
      ('0605002825P107058385', 'DAKSHABEN ASHWINBHAI RAVAL', 1000000, 46822.55, '2025-08-01', '2026-08-01', 'Individual'),
      ('0605002825P107063244', 'SMT. DEVIKABEN N. DESAI', 1000000, 41479.42, '2025-08-04', '2026-08-04', 'Individual'),
      ('0605002825P107150111', 'JOSHI NIMESHBHAI KANTILAL', 2000000, 74529.46, '2025-08-11', '2026-08-11', 'Individual'),
      ('0605002825P107245525', 'DRUV NIMESH JOSHI', 1000000, 27084.95, '2025-08-11', '2026-08-11', 'Individual'),
      ('0605002825P107476106', 'GIRISHCHANDRA B. SHUKLA', 500000, 19902, '2025-08-15', '2026-08-15', 'Individual'),
      ('0605002825P107476451', 'JATIN C SHAH', 1500000, 84677.10, '2025-08-18', '2026-08-18', 'Individual'),
      ('0605002825P108058535', 'MIHIR M TRIVEDI', 500000, 18575.00, '2025-08-24', '2026-08-24', 'Individual'),
      ('0605002825P108124088', 'VIVISHA MAHENDRA SHAH', 1000000, 6748.75, '2025-09-17', '2026-09-17', 'Individual'),
      ('0605002825P108766335', 'POONAM P BHATT', 1000000, 21119.00, '2025-09-04', '2026-09-04', 'Individual'),
      ('0605002825P110623047', 'MAHESH B. THAKER', 1000000, 26570.00, '2025-10-02', '2026-10-02', 'Individual'),
      ('0605002825P110623190', 'REKHABEN M.TRIVEDI', 1000000, 28109.00, '2025-10-08', '2026-10-08', 'Individual'),
      ('0605002825P110790795', 'RAMESH P PATEL', 2500000, 82452.97, '2025-10-09', '2026-10-09', 'Individual'),
      ('0605002825P110886274', 'SAMIR J. DAVE', 2500000, 92596.50, '2025-10-22', '2026-10-22', 'Individual'),
      ('0605002825P110886568', 'MAHESH.S.SHAH', 1500000, 49852.20, '2025-10-07', '2026-10-07', 'Individual'),
      ('0605002825P110886763', 'POPATLAL PATEL', 1000000, 39353.00, '2025-10-14', '2026-10-14', 'Individual'),
      ('0605002825P110887725', 'SMT. SHAKUNTALABEN POPATLAL PATEL', 1000000, 39353.00, '2025-10-14', '2026-10-14', 'Individual'),
      ('0605002825P110973539', 'NIPA V SHAH', 1500000, 25342.00, '2025-10-10', '2026-10-10', 'Individual'),
      ('0605002825P111028072', 'PURVI.H.MEHTA', 1500000, 25342.00, '2025-10-14', '2026-10-14', 'Individual'),
      ('0605002825P111033327', 'CHITRA NARENDRA GOPALANI', 1000000, 25899.00, '2025-10-12', '2026-10-12', 'Individual'),
      ('0605002825P111064065', 'RAKESH M JANI', 2000000, 52470.40, '2025-10-20', '2026-10-20', 'Individual'),
      ('0605002825P111276807', 'VYOMESHBHAI B. SHAH', 1000000, 21931.00, '2025-10-25', '2026-10-25', 'Individual'),
      ('0605002825P111277469', 'MINESH P SHAH', 1500000, 26882.15, '2025-10-24', '2026-10-24', 'Individual'),
      ('0605002825P111311674', 'SHWETA HARSHAL BHATT', 500000, 4048.00, '2025-10-29', '2026-10-29', 'Individual'),
      ('0605002825P111341133', 'PAWAN KAKKAR', 1500000, 25342.00, '2025-10-28', '2026-10-28', 'Individual'),
      ('0605002825P112378463', 'SAVITABEN CHANDULAL SHAH', 1000000, 16866.00, '2025-11-26', '2026-11-26', 'Individual'),
      ('0605002825P112390204', 'JAIN MAHENDRA', 2000000, 49698.30, '2025-11-04', '2026-11-04', 'Individual'),
      ('0605002825P112434154', 'KSHEMA AMIT DESAI', 1500000, 41752.70, '2025-12-01', '2026-12-01', 'Individual'),
      ('0605002825P112589990', 'MURLIDHAR H. JETHWANI', 1000000, 32943.15, '2025-11-07', '2026-11-07', 'Individual'),
      ('0605002825P112590228', 'KIRITKUMAR G. DAVE', 2500000, 74208.30, '2025-11-09', '2026-11-09', 'Individual'),
      ('0605002825P112768987', 'POPATLAL PATEL', 1000000, 39353.00, '2025-11-08', '2026-11-08', 'Individual'),
      ('0605002825P112769403', 'MISHRIMAL A.SHAH', 2000000, 64816.60, '2025-11-20', '2026-11-20', 'Individual'),
      ('0605002825P112769924', 'ROHIT D. DESAI', 2000000, 61418.45, '2025-11-29', '2026-11-29', 'Individual'),
      ('0605002825P112891050', 'MR. YAGNESHBHAI C. SEVAK', 1500000, 44442.42, '2025-11-14', '2026-11-14', 'Individual'),
      ('0605002825P112933591', 'VISHWAS SHARMA', 1500000, 24190.40, '2025-11-28', '2026-11-28', 'Individual'),
      ('0605002825P113127818', 'JYOTSNA J MADIA', 1000000, 23392.80, '2025-11-21', '2026-11-21', 'Individual'),
      ('0605002825P113766713', 'MITHIBEN D. PARIKH', 2500000, 99706.30, '2025-12-07', '2026-12-07', 'Individual'),
      ('0605002825P113813338', 'SHAH VASUMATIBEN', 1500000, 48805.00, '2025-12-07', '2026-12-07', 'Individual'),
      ('0605002825P113899206', 'ISHA C DESAI', 500000, 7852.50, '2025-12-14', '2026-12-14', 'Individual'),
      ('0605002825P113899820', 'SMT. USHABEN C. DESAI', 1000000, 22488.00, '2025-12-14', '2026-12-14', 'Individual'),
      ('0605002825P113943076', 'MODI NALINKUMAR HIRALAL', 1000000, 21513.20, '2025-12-04', '2026-12-04', 'Individual'),
      ('0605002825P114184130', 'VILASBEN ANIL SHAH', 1500000, 48735.00, '2025-12-15', '2026-12-15', 'Individual'),
      ('0605002825P114244410', 'NAINESH S SHAH', 1500000, 25330.80, '2025-12-13', '2026-12-13', 'Individual'),
      ('0605002825P114452581', 'RATANBEN R SHAH', 1500000, 45079.00, '2025-12-27', '2026-12-27', 'Individual'),
      ('0605002825P114453378', 'DARSHAN ENGINEER', 1000000, 32677.15, '2025-12-16', '2026-12-16', 'Individual'),
      ('0605002825P114453919', 'PANKAJ PAREKH', 1500000, 30078.75, '2025-12-28', '2026-12-28', 'Individual'),
      ('0605002825P114530592', 'TRIVEDI NIRAV', 1000000, 18999.00, '2025-12-20', '2026-12-20', 'Individual'),
      ('0605002825P114640580', 'ANAND.N.JAGTIANI', 2000000, 63890.44, '2025-12-22', '2026-12-22', 'Individual'),
      ('0605002825P115023067', 'MR. VIPULBHAI SHAH', 2500000, 77065.90, '2026-01-05', '2027-01-05', 'Individual'),
      ('0605002825P115023425', 'RUPESHBHAI V SHAH', 2000000, 49016.43, '2025-12-29', '2026-12-29', 'Individual')
  ) AS policies(policy_no, client_name, sum_ins, prem, start_dt, renew_dt, holder_type)
) policies
INNER JOIN clients c ON 
  c.agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid AND 
  LOWER(TRIM(c.full_name)) = LOWER(TRIM(policies.client_name))
ON CONFLICT (agent_id, policy_number, workspace) DO NOTHING;

COMMIT;

-- Verify insertion
SELECT COUNT(*) as total_policies FROM policies 
WHERE agent_id = 'd5dc1226-0cf8-4ec4-bad5-acf8e182f0d7'::uuid
AND company = 'United India Insurance';
