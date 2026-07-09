# Quick Start: Fix Missing Policies

## What Was Wrong?

1. **Graph showed zero renewals** from July-December (but PDFs had data)
2. **Database missing many policies** (533 clients / 592 policies shown, but PDFs have more)
3. **Totals don't match** between PDFs and dashboard

## What Was Fixed?

✅ **Analytics now shows all renewals** across 12 months  
✅ **Original renewal dates preserved** from PDFs (no more data corruption)  
✅ **Tools created** to find and import missing policies  

---

## Step-by-Step Fix (5 minutes)

### 1. Install Dependencies
```bash
cd /Users/ravib/Desktop/AgentSaathi
npm install
```

### 2. Find Your PDFs Location
Where did you upload the policy PDFs? For example:
- `/Users/ravib/Desktop/AgentSaathi/uploads`
- `/Users/ravib/Desktop/PolicyPDFs`
- Or wherever you stored them

### 3. Get Your Agent ID
```bash
# Look in your .env.local file or get from Supabase
cat .env.local | grep SUPABASE
```

Then go to Supabase dashboard → SQL Editor → Run:
```sql
SELECT id, email FROM agents;
```

Copy your agent UUID (looks like: `abc12345-6789-...`)

### 4. Run Audit (See What's Missing)
```bash
# Replace with your actual paths
export UPLOAD_DIR=/Users/ravib/Desktop/PolicyPDFs
export AGENT_ID=your-agent-uuid-here

npm run audit-policies
```

**This will show:**
- How many policies are missing
- Which PDFs have missing data
- Total premium/SI differences
- Monthly renewal breakdown

### 5. Import Missing Policies

**First, preview (dry run):**
```bash
export DRY_RUN=true
npm run import-missing
```

**Then, import for real:**
```bash
unset DRY_RUN
npm run import-missing
```

**Wait 5 seconds** (script gives you time to cancel)

### 6. Verify in Dashboard
1. Refresh your dashboard
2. Check total clients/policies count
3. Look at monthly renewals graph - should show data in all months now!

---

## Example Commands (Copy-Paste)

```bash
# Install
npm install

# Set your paths (CHANGE THESE!)
export UPLOAD_DIR=/Users/ravib/Desktop/PolicyPDFs
export AGENT_ID=abc12345-6789-your-uuid-here

# Check what's missing
npm run audit-policies

# Import missing policies (preview first)
export DRY_RUN=true
npm run import-missing

# Actually import
unset DRY_RUN
npm run import-missing
```

---

## What Each Script Does

### `npm run audit-policies`
**Read-only** - Analyzes PDFs vs database:
- Finds missing policies
- Compares totals
- Shows renewal distribution
- Lists discrepancies

### `npm run import-missing`
**Writes to database** - Imports missing policies:
- Creates new clients if needed
- Adds missing policies
- Skips duplicates automatically
- Reports what was added

---

## Expected Results

### Before:
- Dashboard: 533 clients, 592 policies
- Graph: Zero renewals Jul-Dec
- Missing premium totals

### After:
- Dashboard: Matches PDF totals exactly
- Graph: Shows renewals in all relevant months
- All policies accounted for

---

## Safety Notes

✅ **Safe to run multiple times** - Scripts check for duplicates  
✅ **Preview with DRY_RUN** - See what will change before committing  
✅ **Backup recommended** - Export database before large imports  
✅ **Original PDFs untouched** - Scripts only read PDFs, never modify  

---

## Troubleshooting

### "No PDFs found"
- Check UPLOAD_DIR path is correct
- Make sure PDFs are .pdf extension
- Try absolute path: `/Users/ravib/Desktop/PolicyPDFs`

### "Missing credentials"
- Check `.env.local` exists in project root
- Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### Graph still shows zeros
- Hard refresh browser (Cmd+Shift+R on Mac)
- Clear browser cache
- Check if renewals actually exist for those months in PDFs

### Import creates duplicates
- Script checks policy_number before inserting
- If duplicates appear, they may be from different agents
- Check policy numbers are unique in your PDFs

---

## Need More Details?

See `POLICY_FIXES.md` for:
- Complete technical documentation
- How the fixes work
- Advanced troubleshooting
- Best practices

---

## Questions?

Common questions answered in `POLICY_FIXES.md`:
- Why were dates being changed?
- How does the name matching work?
- What PDF formats are supported?
- How to verify the fixes worked?

---

## TL;DR

```bash
# Install, audit, and import in one go
npm install
export UPLOAD_DIR=/path/to/pdfs
export AGENT_ID=your-uuid
npm run audit-policies
npm run import-missing
```

That's it! Your policies should now match your PDFs, and the analytics graph will show all renewals correctly. 🎉
