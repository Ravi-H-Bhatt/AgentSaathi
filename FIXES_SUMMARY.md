# Policy Database Fixes - Summary

## 🎯 Problems Solved

### Problem 1: Graph Shows Zero Renewals (July-December)
**What was wrong:** Analytics filtered to ONLY show renewals in current year (2026). PDFs have policies with renewal dates in 2025/26/27, but they were excluded from the graph.

**What I fixed:**
- Updated `PremiumAnalytics.tsx` to calculate NEXT occurrence of each renewal
- Now shows recurring annual renewals properly
- Displays renewals across all 12 months

### Problem 2: Renewal Dates Were Modified During Import
**What was wrong:** When extracting PDFs, dates like "15/03/2025" were automatically changed to "15/03/2026" (current year). This corrupted the original data.

**What I fixed:**
- Disabled date adjustment in `newindia.ts` 
- Disabled date adjustment in `register.ts`
- Original dates from PDFs now preserved exactly as-is

### Problem 3: Missing Policies in Database  
**What was wrong:** Dashboard shows 533 clients and 592 policies, but PDFs contain more. Many policies failed to import.

**What I created:**
- **Audit script** (`scripts/audit-and-fix-policies.ts`) - Finds missing policies
- **Import script** (`scripts/import-missing-policies.ts`) - Adds missing policies safely

---

## 📝 Files Changed

### 1. `src/components/PremiumAnalytics.tsx`
**Changed:** Renewal calculation logic
```typescript
// BEFORE: Only showed renewals in current year
if (d.getFullYear() !== year) continue;

// AFTER: Calculates next occurrence for recurring policies
// Shows renewals in current AND next year
```

### 2. `src/lib/newindia.ts`
**Changed:** Commented out date adjustment
```typescript
// BEFORE: Modified renewal dates
if (renewalDate) {
  renewalDate = adjustRenewalToFuture(renewalDate);
}

// AFTER: Preserves original dates
// (date adjustment code commented out)
```

### 3. `src/lib/register.ts`  
**Changed:** Commented out date adjustment
```typescript
// BEFORE: Modified renewal dates
if (renewal_date) {
  renewal_date = adjustRenewalToFuture(renewal_date);
}

// AFTER: Preserves original dates
// (date adjustment code commented out)
```

### 4. `scripts/audit-and-fix-policies.ts` ✨ NEW
**Purpose:** Audit tool to find missing policies
- Extracts all policies from PDFs
- Compares with database
- Reports discrepancies and missing policies
- Shows financial impact

### 5. `scripts/import-missing-policies.ts` ✨ NEW
**Purpose:** Import tool to add missing policies
- Finds policies in PDFs but not in database
- Creates new clients if needed
- Imports missing policies safely
- Avoids duplicates

### 6. `package.json`
**Added scripts:**
```json
"scripts": {
  "audit-policies": "tsx scripts/audit-and-fix-policies.ts",
  "import-missing": "tsx scripts/import-missing-policies.ts"
}
```

**Added dependency:**
```json
"devDependencies": {
  "tsx": "^4.19.2"  // TypeScript executor
}
```

### 7. `POLICY_FIXES.md` ✨ NEW
Complete technical documentation with:
- Detailed explanation of problems and fixes
- How to use audit and import scripts
- Troubleshooting guide
- Best practices

### 8. `QUICK_START_POLICY_FIX.md` ✨ NEW
Quick reference guide:
- 5-minute setup instructions
- Copy-paste commands
- Common issues and solutions

---

## 🚀 How to Use

### Quick Commands
```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export UPLOAD_DIR=/path/to/your/pdfs
export AGENT_ID=your-agent-uuid

# 3. Run audit to see what's missing
npm run audit-policies

# 4. Import missing policies (preview first)
export DRY_RUN=true
npm run import-missing

# 5. Import for real
unset DRY_RUN
npm run import-missing
```

### Where to Put Your PDFs
Set `UPLOAD_DIR` to where you stored the policy PDF files:
```bash
export UPLOAD_DIR=/Users/ravib/Desktop/PolicyPDFs
```

### Get Your Agent ID
From Supabase SQL Editor:
```sql
SELECT id, email FROM agents;
```

---

## ✅ What Will Happen After Running Scripts

### Dashboard Changes:
- ✅ Total clients count will match PDF data
- ✅ Total policies count will match PDF data  
- ✅ Total premiums will match sum of all PDFs
- ✅ Total sum insured will match sum of all PDFs

### Analytics Graph Changes:
- ✅ Will show renewals in ALL months (no more zero months)
- ✅ Displays recurring annual policies correctly
- ✅ Calculates next occurrence for each renewal date

### Database Changes:
- ✅ Missing policies will be added
- ✅ New clients will be created if needed (matched by name)
- ✅ Original renewal dates preserved (no more modification)
- ✅ No duplicates (checked by policy_number)

---

## 🔍 How to Verify Fixes Worked

### 1. Check Totals
Go to Dashboard:
- Total clients should match your expectations
- Total policies should match count from PDFs
- Premium total should be accurate

### 2. Check Graph
Look at Premium Analytics:
- Should see data in all relevant months
- No zero months (unless genuinely no renewals)
- Hover over points to see exact counts

### 3. Check Individual Policies
Go to Clients page:
- Search for specific client from PDFs
- Verify policy details match
- Check renewal date is correct

### 4. Run Audit Again
```bash
npm run audit-policies
```

Should show:
- ✅ 0 missing policies
- ✅ Totals match between PDFs and database

---

## 💡 Technical Explanation

### Why Were Renewals Not Showing?

**Original Code:**
```typescript
// In PremiumAnalytics.tsx
const year = new Date().getFullYear(); // 2026
for (const p of policies) {
  const d = new Date(p.renewal_date);
  if (d.getFullYear() !== year) continue; // ← PROBLEM!
  // Only processes 2026 renewals
}
```

**Problem:** PDFs have renewals in 2025, 2026, 2027. But code only showed 2026, so:
- 2025 renewals → Skipped
- 2026 renewals → Shown (Jan-Jun had data)
- 2027 renewals → Skipped (so Jul-Dec showed zero)

**Fixed Code:**
```typescript
// Calculate NEXT occurrence of renewal
let nextRenewal = new Date(d);
if (renewalYear < currentYear) {
  nextRenewal.setFullYear(currentYear);
}
if (nextRenewal < now) {
  nextRenewal.setFullYear(currentYear + 1);
}
// Now show in appropriate month
```

**Result:** All renewals now appear in their correct months, showing complete data.

### Why Were Dates Being Changed?

**Original Extraction Flow:**
```
PDF: "Renewal: 15/03/2025"
  ↓
Parser: "2025-03-15"
  ↓
adjustRenewalToFuture(): "2026-03-15" ← Changed!
  ↓
Database: "2026-03-15" ← Wrong data stored!
```

**Fixed Extraction Flow:**
```
PDF: "Renewal: 15/03/2025"
  ↓
Parser: "2025-03-15"
  ↓
(no adjustment)
  ↓
Database: "2025-03-15" ← Correct data stored!
```

---

## 📊 Expected Numbers

### Before Fixes:
- Dashboard: 533 clients, 592 policies
- Graph: Zero renewals in Jul-Dec
- Missing many policies from PDFs

### After Fixes:
- Dashboard: Should match your PDF totals
- Graph: All months with renewals shown
- All policies from PDFs in database

---

## ⚠️ Important Notes

### Safe to Run Multiple Times
- Audit script is read-only (never modifies data)
- Import script checks for duplicates (won't create duplicates)
- Both scripts can be run repeatedly safely

### Backup Recommended
Before bulk imports:
```bash
# Using Supabase CLI or dashboard
supabase db dump > backup.sql
```

### Preview Before Import
Always run with `DRY_RUN=true` first:
```bash
export DRY_RUN=true
npm run import-missing
```

This shows what WOULD be imported without actually doing it.

---

## 📚 Documentation

### Quick Start
Read `QUICK_START_POLICY_FIX.md` for:
- 5-minute setup
- Copy-paste commands
- Common issues

### Complete Guide  
Read `POLICY_FIXES.md` for:
- Technical details
- Troubleshooting
- Best practices
- Advanced usage

---

## 🎉 Summary

**3 core issues fixed:**
1. ✅ Graph now shows all renewals (no more zeros)
2. ✅ Renewal dates preserved from PDFs (no more corruption)
3. ✅ Tools to find and import missing policies

**2 new scripts created:**
1. ✅ Audit script - finds discrepancies
2. ✅ Import script - adds missing policies

**3 documents created:**
1. ✅ This summary
2. ✅ Quick start guide  
3. ✅ Complete technical guide

**Next step:** Run the audit to see your specific issues:
```bash
npm install
export UPLOAD_DIR=/path/to/pdfs
export AGENT_ID=your-uuid
npm run audit-policies
```
