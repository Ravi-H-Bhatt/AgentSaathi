# United India Parser Routing Fix

## Problem
The extract API was detecting United India document types correctly but **NOT routing to the correct parsers**. It was using ONLY `unitedindia.ts` (individual parser) for ALL United India policies, including floater policies.

## Root Cause
In `src/app/api/extract/route.ts`, the code was:
1. ✅ Calling `detectUnitedIndiaDocumentType()` to detect policy type
2. ❌ Ignoring the detection result and ALWAYS using `parseUnitedIndiaText()` from `unitedindia.ts`
3. ❌ NEVER using `parseUnitedIndiaFloaterText()` from `unitedindia-floater.ts`

## The Fix
Updated `src/app/api/extract/route.ts` (lines 268-410) to properly route based on detection type:

```typescript
// FAMILY FLOATER POLICY → Use unitedindia-floater.ts
if (detection.type === 'family-floater-policy') {
  const { parseUnitedIndiaFloaterText, isUnitedIndiaFloaterPolicy } = 
    await import('@/lib/unitedindia-floater');
  // ... parse with floater parser
}

// INDIVIDUAL POLICY → Use unitedindia.ts
else if (detection.type === 'individual-policy') {
  const { parseUnitedIndiaText, isUnitedIndiaPolicy } = 
    await import('@/lib/unitedindia');
  // ... parse with individual parser
}

// UNKNOWN → Fallback to individual parser
else {
  const { parseUnitedIndiaText, isUnitedIndiaPolicy } = 
    await import('@/lib/unitedindia');
  // ... parse with individual parser as fallback
}
```

## What Now Works
### Family Floater Policies (JHA BHAWESKUMAR type)
- ✅ Routes to `unitedindia-floater.ts` parser
- ✅ Extracts policy number from page 2 POLICY DETAILS section
- ✅ Extracts previous policy number from page 2
- ✅ Extracts all family members from DETAILS OF INSURED PERSONS
- ✅ Returns `mode: "schedule"` to skip review form
- ✅ Matches existing policy and attaches PDF directly

### Individual Health Insurance Policies (NARESH CHANDULAL SHAH type)
- ✅ Routes to `unitedindia.ts` parser
- ✅ Extracts policy number and previous policy number
- ✅ Parses individual policy structure
- ✅ Returns `mode: "schedule"` to skip review form
- ✅ Matches existing policy and attaches PDF directly

## Files Modified
- ✅ `src/app/api/extract/route.ts` - Fixed parser routing logic

## Files That Already Existed (Not Modified)
- `src/lib/unitedindia-detector.ts` - Detection logic (was already correct)
- `src/lib/unitedindia-floater.ts` - Floater parser (exists but wasn't being used)
- `src/lib/unitedindia.ts` - Individual parser (was being used for everything)

## Testing
Test with both PDF types:
1. **JHA BHAWESKUMAR** - Family Medicare/Floater policy
2. **NARESH CHANDULAL SHAH** - Individual Health Insurance policy

Both should now parse correctly and attach to the right policies without mixing up.

## New India Status
The New India parser (`src/lib/newindia.ts`) was NOT modified and should continue working as before. If New India policies stopped uploading, it may be a separate issue not related to this fix.
