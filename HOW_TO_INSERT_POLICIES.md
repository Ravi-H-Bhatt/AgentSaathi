# How to Insert 26 Policies into Supabase

## Quick Steps (2 minutes)

### Step 1: Get Your UUIDs

**Get Agent ID:**
1. Open Supabase Dashboard
2. Go to SQL Editor → New Query
3. Run:
```sql
SELECT id, email FROM agents;
```
4. Copy your agent ID (looks like: `abc123de-5678-...`)

**Get Client ID:**
```sql
SELECT id, full_name FROM clients;
```
4. Copy any client ID you want to use

### Step 2: Open INSERT_POLICIES.sql

File location: `/Users/ravib/Desktop/AgentSaathi/INSERT_POLICIES.sql`

Or copy-paste this ready-to-use query below ⬇️

### Step 3: Replace Placeholders

Find and replace in the query:
- `YOUR_AGENT_UUID` → Your actual agent UUID
- `YOUR_CLIENT_UUID` → Your actual client UUID

**Example:**
```sql
-- BEFORE:
('YOUR_AGENT_UUID', 'YOUR_CLIENT_UUID', '21060046240100000100', ...)

-- AFTER:
('abc123de-5678-90ab-cdef-1234567890ab', 'xyz789ab-cdef-1234-5678-90abcdef1234', '21060046240100000100', ...)
```

### Step 4: Paste into Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. SQL Editor → New Query
4. Paste the entire query
5. Click "Run"

### Step 5: Verify

```sql
SELECT COUNT(*) FROM policies;
```

You should see the count increased by 26.

---

## Ready-to-Copy Query

Replace the placeholders with your actual UUIDs and paste into Supabase SQL Editor:

```sql
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
```

---

## What Gets Added

✅ **26 policies** with data across multiple months  
✅ **Total Premium:** ₹5,67,410  
✅ **Total Sum Insured:** ₹4,18,671,003  
✅ **Date Range:** Jul 2025 to Jun 2026  
✅ **Policy Types:** Burglary, Shopkeepers, Householders, Fire, SME Suraksha

---

## Troubleshooting

### "ERROR: foreign key violation"
- Means agent_id or client_id doesn't exist
- Run the queries above to get correct UUIDs
- Make sure you replace both placeholders

### "ERROR: duplicate key value violates unique constraint"
- Some policies already exist in database
- Check if these policy numbers are already added
- You can modify policy_number if needed

### "All policies added but dashboard shows old counts"
- Refresh the page (Cmd+Shift+R on Mac)
- Clear browser cache
- Wait a few seconds for database to sync

---

## Verification

After inserting, run these to verify:

**Check total policies:**
```sql
SELECT COUNT(*) as total_policies FROM policies;
```

**Check renewal dates distribution:**
```sql
SELECT 
  DATE_TRUNC('month', renewal_date)::date as month,
  COUNT(*) as count,
  SUM(premium) as total_premium
FROM policies
WHERE agent_id = 'YOUR_AGENT_UUID'
GROUP BY DATE_TRUNC('month', renewal_date)
ORDER BY month;
```

**Check specific policies:**
```sql
SELECT policy_number, premium, sum_insured, renewal_date 
FROM policies 
WHERE agent_id = 'YOUR_AGENT_UUID'
ORDER BY renewal_date;
```

---

## Done! 🎉

Your dashboard should now show:
- Updated total clients and policies
- New premium and sum insured totals
- Graph showing renewals across months

Any issues? Check the troubleshooting section above!
