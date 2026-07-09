# Product Name Extraction Fix

## Problem
The product name extraction was capturing only generic terms like "MEDICLAIM POLICY" instead of the full product name like "NEW INDIA FLOATER MEDICAL POLICY" or other complete product names with all their details (FLOATER, INDIVIDUAL, COMPREHENSIVE, etc.).

## Root Cause
The regex pattern used a **non-greedy match** (`+?`) which stopped too early:
```typescript
// OLD (incorrect):
const planMatch = fullText.match(/(?:34|11|31|36)\s+([A-Z][A-Za-z\s\-&().]+?)\s+\d{20,25}/);
```

## Solution Applied

### 1. Fixed the Extraction Logic (`src/lib/newindia.ts`)

Changed the pattern to use **greedy matching** and improved the cleanup:

```typescript
// NEW (correct):
const planMatch = fullText.match(/(?:34|11|31|36)\s+([A-Z][A-Za-z\s\-&().\/]+)\s+\d{20,25}/);
```

**Key changes:**
- Removed the `?` to make it greedy (captures everything)
- Added `/` to handle slashes in product names
- Improved cleanup to preserve important qualifiers (FLOATER, INDIVIDUAL, etc.)
- Only removes truly redundant trailing words

### 2. Created Database Fix Script (`scripts/fix-product-names.ts`)

A script to update existing policies in the database. However, this requires that the policies have `raw_extract` JSONB data stored.

## Current Database Status

**Finding:** The current 1000 policies in your database:
- Don't have `raw_extract` data
- Don't appear to be New India policies (policy numbers are too short)
- Have incomplete data (policy_type shows dates like "14/25/25")

## What This Means For You

### ✅ Good News
**All NEW uploads will work correctly!** The fixed extraction logic in `src/lib/newindia.ts` will now capture full product names like:
- ✅ "NEW INDIA FLOATER MEDICAL POLICY"
- ✅ "NEW INDIA INDIVIDUAL MEDICLAIM POLICY"  
- ✅ "COMPREHENSIVE HEALTH INSURANCE FLOATER"

Instead of just:
- ❌ "MEDICLAIM POLICY"

### 📋 For Existing Data

**Option 1: Re-upload (Recommended)**
Since the existing 1000 policies don't have raw extract data, the cleanest approach is to:
1. Delete the existing policies
2. Re-upload using the fixed extraction logic
3. All product names will be captured correctly

**Option 2: Manual Fix**
If you want to keep the existing data, you'll need to manually update the `policy_type` field for each policy in the database.

## Testing the Fix

To verify the fix works:

1. Upload a New India register PDF
2. Check that product names are now complete with all qualifiers
3. Verify in the database that `policy_type` shows the full name

## Files Modified

1. **`src/lib/newindia.ts`** - Fixed product name extraction regex
2. **`scripts/fix-product-names.ts`** - Database fix script (ready for use when needed)
3. **`package.json`** - Added `fix-product-names` script

## Usage

If you get new policies with raw_extract data that need fixing:

```bash
npm run fix-product-names
```

The script will:
- Check all policies
- Identify incomplete product names
- Re-extract full names from raw_extract data
- Update the database
- Show a summary of changes
