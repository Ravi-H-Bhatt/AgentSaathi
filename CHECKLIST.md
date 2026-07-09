# Policy Fix Checklist ✅

Use this checklist to fix your policy database step by step.

---

## 🎯 Pre-Flight Checks

- [ ] I have access to all policy PDF files
- [ ] I know where the PDFs are stored (path)
- [ ] I have my Supabase credentials in `.env.local`
- [ ] I have my Agent UUID from database
- [ ] I have Node.js installed (v18 or higher)
- [ ] I have npm installed

**If any checkbox is empty, complete it before proceeding!**

---

## 📦 Installation (One-Time Setup)

### Step 1: Install Dependencies
```bash
cd /Users/ravib/Desktop/AgentSaathi
npm install
```

- [ ] Dependencies installed without errors

---

## 🔍 Audit Phase (Safe - Read-Only)

### Step 2: Set Environment Variables
```bash
# Set your PDF directory path
export UPLOAD_DIR=/path/to/your/pdfs

# Set your agent UUID
export AGENT_ID=your-agent-uuid-here
```

**Example:**
```bash
export UPLOAD_DIR=/Users/ravib/Desktop/PolicyPDFs
export AGENT_ID=abc12345-6789-0000-0000-123456789abc
```

- [ ] `UPLOAD_DIR` set to correct path
- [ ] `AGENT_ID` set to my agent UUID
- [ ] Verified variables with: `echo $UPLOAD_DIR` and `echo $AGENT_ID`

### Step 3: Run Audit
```bash
npm run audit-policies
```

- [ ] Audit completed without errors
- [ ] I see total policies in PDFs
- [ ] I see total policies in database
- [ ] I see list of missing policies
- [ ] I see financial impact (missing premium/SI)
- [ ] I see renewal date breakdown

### Step 4: Review Audit Results

**Record your numbers:**
```
Total policies in PDFs:     ___________
Total policies in database: ___________
Missing policies:           ___________
Missing premium:            ₹__________
Missing sum insured:        ₹__________
```

- [ ] I understand the discrepancies
- [ ] I reviewed which PDFs have missing policies
- [ ] The missing count makes sense to me

**Questions to ask yourself:**
- Are the missing policies legitimate? ✓ / ✗
- Do I want to import them? ✓ / ✗
- Should I backup database first? ✓ / ✗

---

## 💾 Backup Phase (Recommended)

### Step 5: Backup Database
```bash
# Using Supabase CLI
supabase db dump > backup-$(date +%Y-%m-%d).sql

# Or export from Supabase Dashboard
```

- [ ] Database backup created
- [ ] Backup file saved in safe location
- [ ] Verified backup file is not empty

**Backup location:** `_______________________________`

---

## 🚀 Import Phase (Writes to Database)

### Step 6: Dry Run (Preview)
```bash
# Preview what will be imported
export DRY_RUN=true
npm run import-missing
```

- [ ] Dry run completed
- [ ] I reviewed the sample policies to be imported
- [ ] The count matches audit results
- [ ] Client names look correct
- [ ] Policy numbers look valid
- [ ] Premium amounts seem reasonable

**Review the output:**
- How many new clients will be created? ________
- How many policies will be imported? ________
- Does this match audit? ✓ / ✗

### Step 7: Import for Real
```bash
# Remove DRY_RUN to actually import
unset DRY_RUN
npm run import-missing
```

**⚠️ Warning: This will write to your database!**

- [ ] I'm ready to import
- [ ] I have a backup
- [ ] I reviewed the dry run output
- [ ] I understand this will modify the database

**Press Enter to proceed, or Ctrl+C to cancel**

---

### Step 8: Monitor Import Progress

Watch the output for:
- Client creation messages
- Batch import progress (Batch 1/X, Batch 2/X, etc.)
- Success/error messages

- [ ] Import started successfully
- [ ] Clients created (if any)
- [ ] All batches completed
- [ ] No errors shown (or errors resolved)
- [ ] Final summary displayed

**Record results:**
```
New clients created:  ___________
Policies imported:    ___________
Total premium added:  ₹__________
Total SI added:       ₹__________
```

---

## ✅ Verification Phase

### Step 9: Check Dashboard

Open your AgentSaathi dashboard in browser.

**Before refresh, record current numbers:**
```
Old total clients:  ___________
Old total policies: ___________
```

**Hard refresh page** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

**After refresh, record new numbers:**
```
New total clients:  ___________
New total policies: ___________
```

- [ ] Total clients increased
- [ ] Total policies increased
- [ ] Numbers match expected from import

### Step 10: Check Premium Analytics Graph

Look at the monthly renewals graph.

**Before (from memory or screenshot):**
- Months with zero renewals: __________________

**After refresh:**
- [ ] Graph shows data in previously-zero months
- [ ] All 12 months have appropriate data
- [ ] Can hover over points to see counts
- [ ] Counts seem reasonable

### Step 11: Spot Check Policies

Pick 3 policies from the "missing" list and verify they're now in database.

**Policy 1:**
```
Policy Number: _________________________
Client Name:   _________________________
```
- [ ] Found in dashboard
- [ ] Client name correct
- [ ] Renewal date correct
- [ ] Premium amount correct

**Policy 2:**
```
Policy Number: _________________________
Client Name:   _________________________
```
- [ ] Found in dashboard
- [ ] Client name correct
- [ ] Renewal date correct
- [ ] Premium amount correct

**Policy 3:**
```
Policy Number: _________________________
Client Name:   _________________________
```
- [ ] Found in dashboard
- [ ] Client name correct
- [ ] Renewal date correct
- [ ] Premium amount correct

### Step 12: Run Audit Again

Verify everything is now in sync.

```bash
npm run audit-policies
```

**Expected results:**
- [ ] Missing policies: 0 (or very close to 0)
- [ ] PDF totals match database totals
- [ ] No significant discrepancies
- [ ] Renewal date distribution looks correct

---

## 🎉 Success Criteria

All of these should be true:

- [ ] Dashboard shows accurate total clients
- [ ] Dashboard shows accurate total policies  
- [ ] Dashboard shows accurate total premium
- [ ] Dashboard shows accurate total sum insured
- [ ] Graph shows renewals in all relevant months
- [ ] No (or minimal) missing policies in audit
- [ ] Spot-checked policies are correct
- [ ] Original renewal dates preserved (not all in one year)

**If all checkboxes are checked: SUCCESS! ✨**

---

## 🔧 If Something Went Wrong

### Import Failed
- [ ] Check error message in console
- [ ] Verify environment variables are set
- [ ] Check Supabase credentials
- [ ] Verify agent ID is correct
- [ ] Try with smaller batch (if possible)

### Duplicates Created
- [ ] Check policy_number for uniqueness
- [ ] Review duplicate detection logic
- [ ] May need to manually clean up

### Numbers Still Don't Match
- [ ] Run audit again to see current state
- [ ] Check if some PDFs weren't processed
- [ ] Verify PDF format is supported
- [ ] Review extraction logs for errors

### Graph Still Shows Zeros
- [ ] Hard refresh browser (clear cache)
- [ ] Check if renewals actually exist for those months
- [ ] Verify code changes were deployed
- [ ] Restart dev server if running locally

---

## 📞 Need Help?

### Check Documentation
- [ ] Read `QUICK_START_POLICY_FIX.md`
- [ ] Read `POLICY_FIXES.md`
- [ ] Read `VISUAL_EXPLANATION.md`
- [ ] Check troubleshooting sections

### Debug Steps
1. **Check logs:** Look for errors in console output
2. **Verify data:** Query database directly to confirm
3. **Test extraction:** Try with single PDF file
4. **Review code:** Check if changes were applied correctly

### Common Issues Document
See `POLICY_FIXES.md` → Troubleshooting section for:
- "No PDFs found in upload directories"
- "Missing Supabase credentials"
- "Missing AGENT_ID"
- Import adds duplicates
- Extraction shows "MISSING" fields

---

## 📊 Final Status

**Date completed:** ___________________

**Final numbers:**
```
Total clients:      ___________
Total policies:     ___________
Total premium:      ₹__________
Total sum insured:  ₹__________
```

**Issues encountered:**
```
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________
```

**Issues resolved:**
```
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________
```

**Outstanding issues (if any):**
```
1. ________________________________________________
2. ________________________________________________
```

**Overall success:** ⭐⭐⭐⭐⭐ (rate 1-5 stars)

---

## 🔄 Maintenance

For future uploads, remember to:

- [ ] Upload PDFs to consistent location
- [ ] Run audit monthly to catch issues early
- [ ] Import missing policies promptly
- [ ] Keep backups before bulk changes
- [ ] Document any manual adjustments

**Next audit scheduled for:** ___________________

---

## ✅ Completion

- [ ] All steps completed
- [ ] All issues resolved
- [ ] Data verified accurate
- [ ] Documentation reviewed
- [ ] Team informed (if applicable)

**Signed off by:** _______________________

**Date:** _______________________

**🎉 Congratulations! Your policy database is now complete and accurate!**
