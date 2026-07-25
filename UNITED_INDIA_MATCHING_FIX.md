# United India Policy Matching Fix

## Problem
When uploading a United India Insurance policy document, the system was showing "policy exists" but:
1. Not matching it to the existing client
2. Not showing "Match found" message
3. Creating duplicate client entries with 0 policies

## Root Cause
United India policies were being extracted as `mode: "single"` which doesn't trigger the policy matching logic. They needed to be processed as `mode: "schedule"` like New India policies to enable:
- Matching by policy number (current or previous)
- Attaching the PDF to existing policy
- Showing "Match found" confirmation

## Solution Implemented

### 1. Updated United India Extractor (`src/lib/unitedindia.ts`)

**Added `previous_policy_number` field:**
```typescript
export interface UnitedIndiaExtraction {
  client_name: string;
  policy_number: string;
  previous_policy_number?: string | null; // NEW!
  company: string;
  // ... rest of fields
}
```

**Updated extraction prompt to capture:**
- Current Policy Number: `0605002825P116693180`
- Previous Policy Number: `0605002824P117164550`

### 2. Updated Extract API (`src/app/api/extract/route.ts`)

**Changed response mode from "single" to "schedule":**
```typescript
return NextResponse.json({
  filePath: path,
  fileName: file.name,
  scanned: false,
  mode: "schedule",  // Changed from "single"
  rows: [policyRow],
  registerType: 'unitedindia-schedule',
  confidence: 1.0,
});
```

This triggers the same matching logic used for New India Policy Schedules.

### 3. How Matching Works Now

The bulk API (`src/app/api/policies/bulk/route.ts`) handles matching:

1. **Extract policy numbers:**
   - Current: `0605002825P116693180`
   - Previous: `0605002824P117164550`

2. **Check database:**
   - Does current number exist? → Match found
   - Does previous number exist? → Match found (renewal)

3. **If match found:**
   - Attach the uploaded PDF to the existing policy
   - Show "Match found" message
   - Update `source_file_path` in database
   - Don't create duplicate client

4. **If no match:**
   - Create new client and policy
   - Attach PDF to new policy

## Testing

### Test Case 1: Upload New Policy
```
Policy Number: NEW123456
Previous Policy: null
Expected: Create new client + policy
```

### Test Case 2: Upload Renewal (Previous Exists)
```
Policy Number: 0605002825P116693180
Previous Policy: 0605002824P117164550
Existing in DB: 0605002824P117164550
Expected: Match found, attach PDF to existing
```

### Test Case 3: Upload Same Policy Again
```
Policy Number: 0605002825P116693180 (already exists)
Expected: Match found, update PDF attachment
```

## Expected Behavior

### Before Fix:
```
Upload United India PDF
↓
"Policy exists" (but no match)
↓
Creates duplicate client with 0 policies
↓
Original client has 1 policy
↓
Duplicate client has 0 policies
```

### After Fix:
```
Upload United India PDF
↓
Extract: Policy# 0605002825P116693180, Previous# 0605002824P117164550
↓
Check Database: Found 0605002824P117164550
↓
✅ MATCH FOUND!
↓
Attach PDF to existing policy
↓
Show: "Match found — document attached to existing policy for JIGNESH RAJENDRAKUMAR SHAH"
```

## UI Messages

### Match Found (Renewal):
```
✅ Match found
Matched an existing policy for "JIGNESH RAJENDRAKUMAR SHAH"
This PDF is now attached — open the client and tap "View" on the policy card to see the full document.
```

### No Match (New Policy):
```
Policy saved
Saved for "JIGNESH RAJENDRAKUMAR SHAH". 
No existing match was found, so it was added as a new policy with this document attached.
```

## Files Changed

1. `/src/lib/unitedindia.ts` - Added previous_policy_number extraction
2. `/src/app/api/extract/route.ts` - Changed mode from "single" to "schedule"
3. `/src/app/api/policies/bulk/route.ts` - Already had matching logic (no changes needed)

## Database Impact

**Before:**
```sql
clients:
- JIGNESH RAJENDRA SHAH (2 policies) ← original
- MR.JIGNESH RAJENDRAKUMAR SHAH (0 policies) ← duplicate
- MR.JIGNESH RAJENDRAKUMAR SHAH. (1 policy) ← duplicate
```

**After:**
```sql
clients:
- JIGNESH RAJENDRAKUMAR SHAH (all policies attached)
No duplicates created!
```

## Cleanup Required

Run the SQL cleanup script to remove existing clients with 0 policies:
```sql
DELETE FROM public.clients
WHERE id IN (
  SELECT c.id
  FROM public.clients c
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.policies p 
    WHERE p.client_id = c.id
  )
);
```

See `CLEANUP_ZERO_POLICY_CLIENTS.sql` for full details.

## Verification

1. Upload a United India policy document
2. Check console logs: `[extract] Detected United India Insurance policy`
3. Check response mode: Should be `"mode": "schedule"`
4. Check UI: Should show "Match found" if policy exists
5. Check database: No duplicate clients created
6. Check client view: PDF should be attached and viewable

## Notes

- This fix makes United India matching consistent with New India
- Previous policy number is crucial for renewals
- Matching works even if client name format is slightly different
- PDF attachment updates existing policy's `source_file_path`
- RLS policies ensure data isolation per agent

---

**Status:** ✅ Fixed
**Date:** [Current Date]
**Tested:** Pending user verification
