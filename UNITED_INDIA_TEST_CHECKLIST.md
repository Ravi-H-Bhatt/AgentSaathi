# United India Policy Upload - Complete Test Checklist

## Test Case: Upload Policy 0605002825P116693180

### PDF Details (from uploaded document):
- **Client Name:** MR.JIGNESH RAJENDRAKUMAR SHAH
- **Current Policy Number:** 0605002825P116693180
- **Previous Policy Number:** 0605002824P117164550
- **Company:** United India Insurance
- **Plan:** Platinum
- **Type:** Individual Health Insurance
- **Sum Insured:** ₹7,00,000 (Total: 200000+200000+150000+150000)
- **Premium:** ₹19,346 (after discounts)
- **Start Date:** 01/02/2026
- **Renewal Date:** 31/01/2027
- **Members:** 4 (Family policy)

---

## Expected Behavior

### Step 1: Upload PDF
1. Go to Upload page
2. Drag/drop or select the United India PDF
3. System uploads to storage

### Step 2: Extraction
**Console Logs:**
```
[extract] Detected United India Insurance policy
[extract] Using Claude to extract United India policy
```

**API Response:**
```json
{
  "filePath": "agent-id/timestamp-filename.pdf",
  "fileName": "JIGNESH_POLICY.pdf",
  "scanned": false,
  "mode": "schedule",
  "rows": [{
    "client_name": "MR.JIGNESH RAJENDRAKUMAR SHAH",
    "policy_number": "0605002825P116693180",
    "previous_policy_number": "0605002824P117164550",
    "company": "United India Insurance",
    "policy_type": "Health Insurance",
    "product_name": "Individual Health Insurance - Platinum",
    "sum_insured": 700000,
    "premium": 19346,
    "start_date": "01/02/2026",
    "renewal_date": "31/01/2027",
    "client_address": "7, MIRAL APPARTMENTS...",
    "policy_holder_type": "Family"
  }],
  "registerType": "unitedindia-schedule",
  "confidence": 1.0
}
```

### Step 3: Matching Logic
**Console Logs:**
```
[bulk] Filtered: 0 to import, 1 duplicates out of 1 valid
[bulk] Schedule matched existing policy — attaching, not creating: 0605002824P117164550
```

**Database Check:**
- Search for policy number `0605002824P117164550` (previous policy)
- OR search for `0605002825P116693180` (current policy)
- If found → MATCH!

### Step 4: UI Display
**Match Found Screen:**
```
✅ Match found

Matched an existing policy for "JIGNESH RAJENDRAKUMAR SHAH"

This PDF is now attached — open the client and 
tap "View" on the policy card to see the full document.

[Upload more]  [View clients]
```

### Step 5: View PDF
1. Click "View clients"
2. Search for "JIGNESH"
3. Click on client name
4. See policy card with "View" button
5. Click "View" → PDF opens in new tab
6. PDF displays correctly (all 10 pages)

---

## What Should NOT Happen

❌ **NO duplicate client created**
- Should NOT see "MR.JIGNESH RAJENDRAKUMAR SHAH" with 0 policies
- Should NOT see multiple JIGNESH entries

❌ **NO "Policy saved" message**
- Should see "Match found" NOT "Policy saved"

❌ **NO missing PDF**
- "View" button should work
- PDF should open correctly

---

## Testing Steps

### 1. Check Current Database State
```sql
-- Find existing JIGNESH clients
SELECT id, full_name, COUNT(p.id) as policy_count
FROM clients c
LEFT JOIN policies p ON p.client_id = c.id
WHERE LOWER(full_name) LIKE '%jignesh%'
GROUP BY c.id, c.full_name
ORDER BY full_name;

-- Find existing policies for JIGNESH
SELECT policy_number, company, product_name, source_file_path
FROM policies
WHERE client_id IN (
  SELECT id FROM clients 
  WHERE LOWER(full_name) LIKE '%jignesh%'
)
ORDER BY created_at DESC;
```

### 2. Upload United India PDF
- Upload the provided PDF
- Watch console for logs
- Check network tab for API responses

### 3. Verify Match Found
- Should see "✅ Match found" message
- Should mention client name "JIGNESH RAJENDRAKUMAR SHAH"
- Should say "This PDF is now attached"

### 4. Verify PDF Attached
```sql
-- Check if source_file_path updated
SELECT 
  policy_number, 
  product_name,
  source_file_path,
  updated_at
FROM policies
WHERE policy_number IN ('0605002825P116693180', '0605002824P117164550')
ORDER BY updated_at DESC;
```

Expected:
- `source_file_path` should have the new PDF path
- `updated_at` should be recent

### 5. View PDF in UI
1. Go to Clients
2. Search "jignesh"
3. Click client
4. Find policy card
5. Click "View" button
6. PDF should open
7. All pages should display

---

## Troubleshooting

### Issue: "Policy saved" instead of "Match found"
**Cause:** Policy number not found in database
**Fix:**
```sql
-- Check if policy exists
SELECT * FROM policies 
WHERE policy_number IN ('0605002825P116693180', '0605002824P117164550');

-- If not found, check normalization
SELECT * FROM policies 
WHERE LOWER(REGEXP_REPLACE(policy_number, '[^a-z0-9]', '', 'gi')) 
IN ('0605002825p116693180', '0605002824p117164550');
```

### Issue: PDF doesn't open (View button fails)
**Cause:** `source_file_path` null or invalid
**Fix:**
```sql
-- Check source_file_path
SELECT id, policy_number, source_file_path 
FROM policies 
WHERE policy_number IN ('0605002825P116693180', '0605002824P117164550');

-- Update manually if needed
UPDATE policies 
SET source_file_path = 'agent-id/timestamp-filename.pdf'
WHERE policy_number = '0605002825P116693180';
```

### Issue: Duplicate client created
**Cause:** Name matching failed
**Fix:** Run cleanup SQL
```sql
-- Delete duplicate clients with 0 policies
DELETE FROM clients WHERE id IN (
  SELECT c.id FROM clients c
  WHERE LOWER(full_name) LIKE '%jignesh%'
  AND NOT EXISTS (
    SELECT 1 FROM policies p WHERE p.client_id = c.id
  )
);
```

---

## Success Criteria

✅ **Extraction:** Mode = "schedule", has previous_policy_number
✅ **Matching:** Console shows "matched existing policy"
✅ **UI:** Shows "✅ Match found" message
✅ **Database:** source_file_path updated
✅ **View:** PDF opens correctly
✅ **No Duplicates:** Only 1 JIGNESH client
✅ **Scroll:** Clicking nav scrolls to top

---

## Final Verification Queries

```sql
-- 1. Count JIGNESH clients (should be 1)
SELECT COUNT(*) FROM clients 
WHERE LOWER(full_name) LIKE '%jignesh%';

-- 2. Check JIGNESH policies
SELECT 
  c.full_name,
  p.policy_number,
  p.product_name,
  p.sum_insured,
  p.premium,
  CASE 
    WHEN p.source_file_path IS NOT NULL THEN 'Has PDF'
    ELSE 'No PDF'
  END as pdf_status
FROM clients c
JOIN policies p ON p.client_id = c.id
WHERE LOWER(c.full_name) LIKE '%jignesh%'
ORDER BY p.created_at DESC;

-- 3. Check for clients with 0 policies
SELECT COUNT(*) FROM clients c
WHERE NOT EXISTS (
  SELECT 1 FROM policies p WHERE p.client_id = c.id
);
```

Expected Results:
- Query 1: 1 client
- Query 2: 2+ policies, all with "Has PDF"
- Query 3: 0 clients with 0 policies

---

## If Everything Works → Commit & Push

```bash
# Check status
git status

# Review changes
git diff

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: Complete United India policy matching fix

- Add previous_policy_number extraction in United India parser
- Change extraction mode from 'single' to 'schedule' for matching
- Add scroll-to-top on navigation click
- Update premium calculator floater logic (min 2 members)
- Enable mobile number editing for all sources
- Add SQL cleanup scripts for zero-policy clients

Fixes:
- United India policies now match existing by current/previous number
- Match found message displays correctly
- PDF attaches to existing policy
- No duplicate clients created
- Smooth scroll to top on nav click"

# Push to repository
git push origin main
```

---

**Ready to Test!** 🚀

Upload the United India PDF and verify all checkpoints pass.
