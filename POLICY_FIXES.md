# Policy Database Fixes - Complete Guide

## Problems Identified & Fixed

### 1. ❌ Graph Shows Zero Renewals (July-December)
**Problem:** The PremiumAnalytics component filtered renewals to ONLY show policies with `renewal_date` in the current year (2024/2026). Since PDFs contain policies with renewal dates in 2025/26/27, they were being excluded from the graph.

**Root Cause:**
```typescript
// OLD CODE (BROKEN)
if (d.getFullYear() !== year) continue; // Skips 2025/26/27 renewals!
```

**Fix Applied:** Updated `src/components/PremiumAnalytics.tsx` to:
- Calculate the NEXT occurrence of each renewal date
- Show recurring annual renewals across current and next year
- Preserve original renewal dates from PDFs

### 2. ❌ Renewal Dates Were Being Modified
**Problem:** During PDF extraction, renewal dates from past years were being automatically adjusted to current/future years. This corrupted the original data.

**Files affected:**
- `src/lib/newindia.ts` - New India Assurance parser
- `src/lib/register.ts` - LIC register parser

**Fix Applied:** Disabled the `adjustRenewalToFuture()` calls to preserve original dates from PDFs.

### 3. ❌ Missing Policies in Database
**Problem:** Total policies and premiums from PDFs don't match database totals. Many policies failed to import.

**Possible Causes:**
- Policies missing client names (skipped during import)
- Policies missing renewal dates (skipped)
- Duplicate detection false positives
- PDF extraction failures

**Fix Applied:** Created audit and import scripts to identify and add missing policies.

---

## How to Audit Your Database

### Step 1: Install Dependencies
```bash
npm install tsx --save-dev
```

### Step 2: Run Audit Script
```bash
# Set your upload directory where PDFs are stored
export UPLOAD_DIR=/path/to/your/pdfs

# Optional: Specify agent ID to audit specific agent
export AGENT_ID=your-agent-uuid

# Run the audit
npm run audit-policies
```

### What the Audit Shows:
- ✅ Total policies in database vs PDFs
- 💰 Total premiums and sum insured comparison
- 📋 List of missing policies by file
- 📅 Renewal date distribution by year and month
- 📊 Monthly renewal breakdown with visualization

### Example Output:
```
📁 Found 15 PDF files

✅ Total policies extracted from PDFs: 650
   Total Premium (PDFs): ₹45,67,890
   Total Sum Insured (PDFs): ₹12,50,00,000

   Total Premium (Database): ₹38,92,340
   Total Sum Insured (Database): ₹10,20,00,000

🔴 Missing policies (in PDFs but NOT in database): 117

📋 Missing policies by file:
   /path/to/policy-register-2025.pdf: 45 policies
      - 210600341234567890123 | RAJESH KUMAR | Premium: ₹12,450 | Renewal: 2025-03-15
      - 210600341234567890124 | PRIYA SHARMA | Premium: ₹8,900 | Renewal: 2025-04-20
      ... and 43 more

💰 Missing policies financial impact:
   Total Premium: ₹6,75,550
   Total Sum Insured: ₹2,30,00,000

📅 Renewal date analysis:
   From extracted PDFs (BEFORE database adjustment):
      2025: 287 policies
      2026: 198 policies
      2027: 165 policies

   From database (AFTER adjustment):
      2026: 592 policies  ← All policies moved to current year!

   Monthly renewals in 2026 (from database):
      Jan:   45 ████
      Feb:   52 █████
      Mar:   68 ██████
      Apr:   41 ████
      May:   38 ███
      Jun:   55 █████
      Jul:    0 
      Aug:    0 
      Sep:    0 
      Oct:    0 
      Nov:    0 
      Dec:    0 
```

---

## How to Import Missing Policies

### Step 1: Dry Run (Preview)
```bash
# Preview what will be imported without making changes
export DRY_RUN=true
export AGENT_ID=your-agent-uuid
export UPLOAD_DIR=/path/to/pdfs

npm run import-missing
```

### Step 2: Import for Real
```bash
# Remove DRY_RUN to actually import
export AGENT_ID=your-agent-uuid
export UPLOAD_DIR=/path/to/pdfs

npm run import-missing
```

**What it does:**
1. Extracts all policies from PDFs
2. Compares with database to find missing policies
3. Creates new clients if needed (by name matching)
4. Inserts missing policies in batches
5. Reports total added and financial impact

### Safety Features:
- ✅ Only adds policies that don't exist (checks by policy_number)
- ✅ Reuses existing clients (matches by normalized name)
- ✅ 5-second countdown before import starts
- ✅ Batch processing (100 policies at a time)
- ✅ Detailed logging of progress

---

## Understanding the Fixes

### Original vs Fixed Flow

#### BEFORE (Broken):
```
1. PDF has policy with renewal_date = "15/03/2025"
2. Parser extracts: renewal_date = "2025-03-15"
3. adjustRenewalToFuture() changes to: "2026-03-15" (current year)
4. Database stores: "2026-03-15" ← Wrong!
5. Analytics filters: if (year !== 2026) continue
6. Only 2026 renewals shown → Missing all original 2025/27 dates
```

#### AFTER (Fixed):
```
1. PDF has policy with renewal_date = "15/03/2025"
2. Parser extracts: renewal_date = "2025-03-15"
3. NO adjustment - stores as-is: "2025-03-15" ← Correct!
4. Database stores: "2025-03-15"
5. Analytics calculates NEXT occurrence: 
   - If today is before March 15, 2025 → shows in March
   - If today is after March 15, 2025 → shows in March 2026
6. All renewals visible in appropriate months
```

### Key Changes in PremiumAnalytics.tsx

```typescript
// OLD: Only show renewals in current year
if (d.getFullYear() !== year) continue;

// NEW: Calculate next occurrence for recurring annual policies
let nextRenewal = new Date(d);
if (renewalYear < currentYear) {
  nextRenewal.setFullYear(currentYear);
}
if (nextRenewal < now) {
  nextRenewal.setFullYear(currentYear + 1);
}
// Show if in current or next year
if (displayYear === currentYear || displayYear === currentYear + 1) {
  // Count this renewal
}
```

---

## Verification Steps

### 1. Check Dashboard Totals
After importing missing policies:
- Dashboard should show correct number of clients and policies
- Total premium should match sum of all PDFs

### 2. Check Monthly Graph
- Graph should show renewals across all 12 months
- No zero months (unless genuinely no renewals)
- Hover over data points to see exact counts

### 3. Verify Individual Policies
Go to Clients page and:
- Search for specific client names from PDFs
- Verify policy details match PDF data
- Check renewal dates are preserved correctly

### 4. Run Audit Again
After import, run audit again to confirm:
```bash
npm run audit-policies
```

Should show:
- ✅ 0 missing policies
- ✅ Totals match between PDFs and database

---

## Troubleshooting

### "No PDFs found in upload directories"
**Solution:** Set UPLOAD_DIR to where your PDFs are located:
```bash
export UPLOAD_DIR=/Users/ravib/Desktop/AgentSaathi/uploads
npm run audit-policies
```

### "Missing Supabase credentials"
**Solution:** Make sure `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### "Missing AGENT_ID"
**Solution:** Get agent UUID from database:
```sql
SELECT id, email FROM agents;
```
Then export it:
```bash
export AGENT_ID=abc123-your-agent-uuid
```

### Import adds duplicates
**Solution:** The import script checks for duplicates by `policy_number`. If you see duplicates:
1. Check if policies have different agent_id
2. Verify policy numbers are unique in PDFs
3. Review database policies table for duplicates

### Extraction shows "MISSING" fields
**Problem:** PDF format not recognized or parsing failed.

**Solution:**
1. Check PDF text layer (some PDFs are image-only)
2. Verify PDF matches expected format (New India or LIC register)
3. Check console logs for specific parsing errors
4. Some fields missing is OK (e.g., phone numbers) but client_name and policy_number are required

---

## Best Practices

### Regular Audits
Run audit monthly to catch missing policies early:
```bash
# Add to cron or run manually
npm run audit-policies > audit-report-$(date +%Y-%m-%d).txt
```

### Backup Before Import
Always backup database before bulk imports:
```bash
# Using Supabase CLI
supabase db dump > backup-$(date +%Y-%m-%d).sql
```

### Test with Dry Run
Always run with `DRY_RUN=true` first to preview changes.

### Keep PDFs Organized
Structure PDFs by date or type:
```
uploads/
  ├── 2025/
  │   ├── new-india-jan-2025.pdf
  │   └── lic-register-jan-2025.pdf
  ├── 2026/
  └── 2027/
```

---

## Technical Details

### Database Schema
```sql
CREATE TABLE policies (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  client_id UUID REFERENCES clients(id),
  policy_number TEXT UNIQUE,
  company TEXT,
  policy_type TEXT,
  sum_insured NUMERIC,
  premium NUMERIC,
  mode TEXT,
  start_date DATE,
  renewal_date DATE,  -- ← Now preserves original dates!
  status TEXT,
  created_at TIMESTAMPTZ
);
```

### Supported PDF Formats

#### 1. New India Assurance Policy Expiry Register
- Policy numbers: 20-25 digits starting with "210600"
- Date format: DD-MMM-YYYY (e.g., "28-Jan-2025")
- Extracts: Policy number, client name, phone, dates, premium, sum insured

#### 2. LIC Agent Register
- Policy numbers: 9 digits
- Date format: DD/MM/YYYY (e.g., "15/03/2025")
- Fixed column layout
- Extracts: Policy number, client name, mode, premium, sum insured, dates

### Name Matching Logic
Clients are matched by normalized name:
```typescript
function nameKey(name: string): string {
  return cleanName(name)
    .replace(/\s+/g, '')
    .toLowerCase();
}
```

This ensures:
- "RAJESH KUMAR" matches "Rajesh Kumar"
- "M/S ABC LTD" matches "MS ABC LTD"
- Case and whitespace differences don't create duplicates

---

## Summary of All Fixes

✅ **Fixed PremiumAnalytics.tsx** - Now shows multi-year recurring renewals  
✅ **Fixed newindia.ts** - Preserves original renewal dates  
✅ **Fixed register.ts** - Preserves original renewal dates  
✅ **Created audit script** - Identifies missing policies and discrepancies  
✅ **Created import script** - Safely adds missing policies to database  
✅ **Added npm scripts** - Easy commands to run tools  
✅ **Added documentation** - Complete guide for maintenance  

---

## Next Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   export UPLOAD_DIR=/path/to/your/pdfs
   export AGENT_ID=your-agent-uuid
   ```

3. **Run audit:**
   ```bash
   npm run audit-policies
   ```

4. **Review output** and verify discrepancies

5. **Import missing policies:**
   ```bash
   # First, dry run
   export DRY_RUN=true
   npm run import-missing
   
   # Then, import for real
   unset DRY_RUN
   npm run import-missing
   ```

6. **Verify in dashboard:**
   - Check total counts
   - Verify monthly graph shows all renewals
   - Spot-check individual policies

7. **Celebrate!** 🎉 Your data is now accurate and complete!

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review console logs for specific errors
3. Verify environment variables are set correctly
4. Ensure PDFs are in expected format
5. Check database permissions for agent account

For critical issues, consider:
- Running audit script with individual PDFs
- Manually reviewing extraction logs
- Checking database constraints and indexes
