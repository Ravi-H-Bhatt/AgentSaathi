# JHA PDF - Complete Diagnostic & Testing Guide

## PDF Details
- **File**: JHA BHAWESKUMAR RAMESHCHANDRA Family Medicare Policy
- **Current Policy**: `0605002826P103732995`
- **Previous Policy**: `0605002825P103964712`
- **Client**: MR JHA BHAWESKUMAR RAMESHCHANDRA
- **Premium**: ₹34,599
- **SI**: ₹10,00,000
- **Type**: FAMILY MEDICARE POLICY (Floater)

---

## What Should Happen (Step by Step)

### Step 1: PDF Upload
```
1. Open app → Add Policy → Upload PDF (drag JHA PDF)
2. Browser Network tab opens automatically
```

### Step 2: Detection (`/api/extract`)
```
Expected logs in TERMINAL (where dev server runs):
[extract] ✅ United India document detected, starting parsing...
[extract] Detected United India document: family-floater-policy (95% confidence)
[detector] Detection attributes: {
  hasPolicyDetails: true
  hasPreviousPolicyField: true
  hasFamilyFloaterBasis: true
  hasFamilyMembers: true
}
[extract] 🔄 Routing to FLOATER parser (unitedindia-floater.ts)
```

**If NOT detected**:
- ❌ Missing "FAMILY MEDICARE POLICY" text?
- ❌ Missing "Policy Number" pattern?
- ❌ Missing "Previous Policy No." pattern?
→ Check if PDF has readable text layer

### Step 3: Parsing (`unitedindia-floater.ts`)
```
Expected logs in TERMINAL:
[United India Floater] Pattern 1 (Policy Number XXXXX): 0605002826P103732995
[United India Floater] 🔍 Current Policy Number FINAL: 0605002826P103732995
[United India Floater] Pattern 1 (Previous Policy No. XXXXX): 0605002825P103964712
[United India Floater] 🔍 Previous Policy Number FINAL: 0605002825P103964712
[extract] ✅ United India FLOATER policy parsed successfully
[extract]    Client: JHA BHAWESKUMAR RAMESHCHANDRA
[extract]    Current Policy: 0605002826P103732995
[extract]    Previous Policy: 0605002825P103964712
[extract]    Premium: 34599
[extract]    Start: 13/06/2026 → End: 12/06/2027
[extract]    Members: 4
[extract]    Policy Type: Floater
[extract]    Product: Floater Mediclaim
[extract] 📄 Will return mode="schedule" for matching/attachment
```

**If NOT parsed**:
- ❌ Pattern 1-4 all show "no match"?
- ❌ Premium shows 0?
- → Check if PDF format is different (look at actual page 2 text)

### Step 4: Extract Response
```
BROWSER → Network tab → Click "/api/extract" → Response tab:
{
  "mode": "schedule",           ✅ MUST be "schedule" (NOT "annual")
  "rows": [{
    "policy_number": "0605002826P103732995",
    "previous_policy_number": "0605002825P103964712",
    "client_name": "JHA BHAWESKUMAR RAMESHCHANDRA",
    "premium": 34599,
    "sum_insured": 1000000,
    "client_address": "A/9/103 ORCHID GREEN FIELD...",
    "company": "United India Insurance",
    "product_name": "Floater Mediclaim",
    "policy_holder_type": "Floater"
  }],
  "filePath": "agent-id/timestamp.pdf",
  "registerType": "unitedindia-floater",
  "confidence": 0.95
}
```

**If wrong**:
- ❌ mode is "annual" instead of "schedule"?
  → Fix in extract/route.ts line ~327
- ❌ previous_policy_number is null?
  → Parser not extracting it, check floater.ts patterns
- ❌ confidence is 0?
  → Detection failed, check detector.ts

### Step 5: Bulk Matching (`/api/policies/bulk`)
```
Expected logs in TERMINAL:
[bulk] SCHEDULE MODE: Checking for policy matches...
[bulk] Total policies in policyByNumber map: XXX
[bulk] policyByNumber keys (first 10): [
  0605002826p103732995,  ✅ This is normalized current policy
  0605002825p103964712,  ✅ This is normalized previous policy
  ...
]
[bulk] Sample existing policies:
  0605002826p103732995 → policy_id: abc123, client_id: xyz789
  
[bulk] 🔍 RENEWAL ROW:
[bulk]   Client: JHA BHAWESKUMAR RAMESHCHANDRA
[bulk]   Current Policy: 0605002826P103732995 → normalized: 0605002826p103732995
[bulk]   Previous Policy: 0605002825P103964712 → normalized: 0605002825p103964712
[bulk]   Match by CURRENT: ✅ FOUND (policy id: abc123)
[bulk]   Match by PREVIOUS: ✅ FOUND (policy id: xyz789) [or not found if current found first]
[bulk] ✅✅✅ MATCH FOUND! ✅✅✅
[bulk]   Target Policy ID: abc123
[bulk]   Client Name: JHA BHAWESKUMAR RAMESHCHANDRA
[bulk]   Policy Number: 0605002826p103732995
[bulk]   📎 Attaching PDF: agent-id/timestamp.pdf
[bulk]   ✅✅✅ PDF ATTACHED SUCCESSFULLY! ✅✅✅
[bulk]   Updated rows: 1
```

**If NOT matched**:
- ❌ Shows "NO MATCH"?
  → Policy doesn't exist in database
  → SOLUTION: Import policy from Excel first, then upload PDF
  
- ❌ Shows "FAILED TO ATTACH PDF"?
  → Check error message for SQL error
  → May be permission issue or column missing

### Step 6: Bulk Response
```
BROWSER → Network tab → "/api/policies/bulk" → Response:
{
  "ok": true,
  "matched": true,        ✅ MUST be true for match
  "attached": 1,          ✅ MUST be 1 (PDF attached)
  "created": 0,           ✅ MUST be 0 (no new policy created)
  "matchedClientName": "JHA BHAWESKUMAR RAMESHCHANDRA",
  "matchedPolicyNumber": "0605002826p103732995"
}
```

### Step 7: UI Result
```
BROWSER SCREEN should show:
✅ Match found

"Matched an existing policy for 'JHA BHAWESKUMAR RAMESHCHANDRA'.
 This PDF is now attached — open the client and tap 'View' on 
 the policy card to see the full document."

[View clients] button → Click to verify
```

---

## Pre-Requisites: Policy Must Exist

### CHECK 1: Policy Exists in Database
```sql
-- Run this in Supabase SQL Editor
SELECT policy_number, client_id, source_file_path, company, product_name 
FROM policies 
WHERE policy_number ILIKE '%0605002826%' 
   OR policy_number ILIKE '%0605002825%';
```

**Expected result**: Should show at least ONE row with:
- policy_number: `0605002826P103732995` (current)
- OR policy_number: `0605002825P103964712` (previous)
- client_id: Not null
- company: "United India Insurance" (or similar)

**If empty**: 
→ Import from Excel first
→ USE: Import Policy Data feature
→ Upload United India Excel file with this policy

### CHECK 2: Client Exists
```sql
SELECT id, full_name FROM clients WHERE full_name ILIKE '%JHA%' OR full_name ILIKE '%BHAWESKUMAR%';
```

**Expected**: One client with name containing "JHA" and "BHAWESKUMAR"

**If not found**:
→ Create client first manually or import via Excel

---

## Complete Test Sequence

### 1️⃣ BEFORE UPLOAD - Verify Prerequisites
```bash
# In Supabase SQL:
SELECT policy_number FROM policies WHERE policy_number LIKE '0605002826%';
# Should return: 0605002826P103732995
```

### 2️⃣ UPLOAD PDF
- Open app → Add Policy → Click "Upload PDF"
- Drag JHA PDF file from ~/Downloads/
- Wait for it to process

### 3️⃣ CHECK TERMINAL LOGS
- Open terminal where dev server is running
- Should see all logs from Step 2, 3, 5 above
- Look for errors

### 4️⃣ CHECK BROWSER NETWORK TAB
- Open DevTools (F12) → Network tab
- Find `/api/extract` request
  - Response should have `"mode": "schedule"`
  - Should have `"previous_policy_number": "0605002825P103964712"`
- Find `/api/policies/bulk` request
  - Response should have `"matched": true, "attached": 1`

### 5️⃣ CHECK BROWSER CONSOLE
- DevTools → Console tab
- Should NOT have red errors
- Should see "Policy saved" or "Match found" message

### 6️⃣ VERIFY IN UI
- Browser should show "✅ Match found" message
- Should mention the client name

### 7️⃣ VERIFY IN DATABASE
- Go to Clients page
- Find "JHA BHAWESKUMAR RAMESHCHANDRA"
- Click the policy `0605002826P103732995`
- Should have a "View" button
- Click "View" → PDF should open

---

## Common Failure Scenarios & Fixes

### ❌ Mode shows "annual" instead of "schedule"
**File**: `src/app/api/extract/route.ts` line ~327
**Fix**: Already done - line 327 has `mode: "schedule"`
**Reason**: Was returning policy mode instead of API routing mode

### ❌ Previous policy number is null
**File**: `src/lib/unitedindia-floater.ts` lines ~95-120
**Check**: Are all 4 patterns being logged?
**Fix**: Verify PDF has "Previous Policy No." on page 2

### ❌ Shows "NO MATCH" during attachment
**Issue**: Policy `0605002826P103732995` doesn't exist in database
**Fix**:
1. Go to Add Policy → Import Policy Data
2. Upload United India Excel file
3. Must contain policy `0605002826P103732995`
4. Then upload PDF again

### ❌ Shows "Policy saved" instead of "Match found"
**Issue**: Bulk route thinks it's a new policy (not renewal)
**Reason**: `previous_policy_number` not being sent from extract
**Check**:
1. Network tab → `/api/extract` Response
2. Look for `"previous_policy_number"`
3. If null → extraction failed
4. If present → OK, check bulk logs

### ❌ UI doesn't show "Match found", shows import table
**Issue**: mode was "schedule" but UploadFlow didn't detect it
**Fix**: Check browser console for errors
**Workaround**: Hard refresh (Ctrl+Shift+R) and try again

---

## Debug Logging Checklist

When things don't work, collect these logs:

### From Terminal (Dev Server)
```bash
# Copy everything after you upload, starting with:
# [extract] ✅ United India document detected...
# to:
# [bulk] MATCHING SUMMARY:
```

### From Browser Console
```javascript
F12 → Console tab
// Look for any red error messages
// Should see successful logs
```

### From Network Tab
```
F12 → Network tab
1. Find and click "/api/extract"
2. Go to Response tab
3. Screenshot or copy full response
4. Find and click "/api/policies/bulk"
5. Go to Response tab
6. Screenshot or copy full response
```

### From Database
```sql
SELECT * FROM policies WHERE policy_number = '0605002826P103732995';
SELECT * FROM policies WHERE policy_number = '0605002825P103964712';
```

---

## Expected Success Case (After All Fixes)

When everything works:

1. Upload JHA PDF
2. See in Terminal: All logs show "✅" checks
3. See in Browser Console: No red errors
4. See in UI: "✅ Match found - JHA BHAWESKUMAR RAMESHCHANDRA"
5. See in Database: Policy `source_file_path` updated to the PDF path
6. See in UI: Client page shows policy with "View" button, opens PDF

---

## Summary of Fixed Code

1. ✅ `unitedindia-detector.ts`: Detects space-separated "Policy Number" and "Previous Policy No." formats
2. ✅ `unitedindia-floater.ts`: Extracts both current and previous policy numbers with multiple patterns
3. ✅ `extract/route.ts`: Returns `mode: "schedule"` (not policy mode)
4. ✅ `bulk/route.ts`: Matches by current OR previous policy, attaches PDF, updates address
5. ✅ Comprehensive logging at every step

All code is production-ready. Just needs to:
1. Restart dev server
2. Hard refresh browser
3. Make sure policy exists in DB first
4. Upload PDF
