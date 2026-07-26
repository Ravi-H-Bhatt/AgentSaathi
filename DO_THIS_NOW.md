# 🚨 DO THIS NOW - 3 STEPS TO GET IT WORKING

## Step 1: Restart Dev Server (2 min)
```bash
# In terminal where npm run dev is running:
1. Press Ctrl+C to stop
2. Wait for "^C" to appear (it stopped)
3. Run: npm run dev
4. Wait for: "ready - started server on 0.0.0.0:3000"
```

## Step 2: Ensure Policy Exists in Database (5 min)

### Option A: Check if it's already there
Go to Supabase → SQL Editor → Run:
```sql
SELECT policy_number, client_id FROM policies 
WHERE policy_number = '0605002826P103732995' 
   OR policy_number = '0605002825P103964712';
```

**If you see rows**: Good! Skip to Step 3

**If empty**: Policy doesn't exist, do Option B below

### Option B: Import the policy from Excel

If you have an Excel file with this policy:
1. Open app → Add Policy → Upload XLSX
2. Select your United India Excel file
3. Click Import
4. Should see success message

**Don't have Excel?** Check Supabase - maybe Harshalbhatt data has it:
```sql
SELECT * FROM policies WHERE company LIKE '%United India%' LIMIT 5;
```

If United India policies exist from previous imports, you're good.

## Step 3: Upload PDF & Verify (3 min)

1. **Browser Hard Refresh**: `Ctrl+Shift+R`
2. **Open DevTools**: F12
3. **Go to Network tab**: Click Network tab
4. **Upload PDF**:
   - Open app → Add Policy → Upload PDF
   - Drag JHA PDF from Downloads
5. **Watch Network tab**:
   - Look for `/api/extract` → Click it → Go to Response tab
   - Should show `"mode": "schedule"` ✅
   - Should show `"previous_policy_number": "0605002825P103964712"` ✅
6. **Look for `/api/policies/bulk`**:
   - Should show `"matched": true` ✅
   - Should show `"attached": 1` ✅
7. **Check UI**:
   - Should display: "✅ Match found"

---

## Verification Checklist

- [ ] Dev server restarted (you see "ready - started server")
- [ ] Policy `0605002826P103732995` exists in database OR imported it
- [ ] Browser hard refreshed (Ctrl+Shift+R)
- [ ] Network tab shows `/api/extract` with `mode: "schedule"`
- [ ] Network tab shows `/api/extract` with `previous_policy_number`
- [ ] Network tab shows `/api/policies/bulk` with `matched: true`
- [ ] Network tab shows `/api/policies/bulk` with `attached: 1`
- [ ] UI shows "✅ Match found" message
- [ ] Terminal has no red error messages
- [ ] Can go to Clients → JHA → see policy with "View" button

If ALL checked ✅: **IT WORKS!** 🎉

---

## If Something's Wrong

### Problem: Network tab shows `/api/extract` but `mode` is "annual"
**Solution**: Dev server wasn't restarted properly
- Stop server (Ctrl+C)
- Start again (`npm run dev`)
- Hard refresh browser (Ctrl+Shift+R)

### Problem: `/api/extract` response shows `previous_policy_number: null`
**Solution**: Parser can't extract previous policy number
- Check Terminal logs for: `[United India Floater] 🔍 Previous Policy Number FINAL:`
- If shows `(none)`: PDF format is different than expected
- Check PDF page 2 for "Previous Policy No." text

### Problem: `/api/policies/bulk` shows "NO MATCH"
**Solution**: Policy doesn't exist in database
- Run SQL: `SELECT * FROM policies WHERE policy_number LIKE '%0605002826%'`
- If empty: Import from Excel first (see Step 2B above)
- If exists: Check bulk route logs in Terminal

### Problem: UI shows "Policy saved" instead of "Match found"
**Solution**: Bulk route thinks it's a new policy
- Check Network → `/api/policies/bulk` Response
- Look for `"matched"` field
- If `false`: Previous policy number wasn't sent from extract
- Check extract logs in Terminal

### Problem: Terminal shows red error messages
**Solution**: Screenshot the error and share it
- Look for `[extract]` or `[bulk]` errors
- Share the exact error message

---

## Quick Test Without Re-uploading

If you just restarted the server and want to verify the code works:

1. Go to terminal
2. Find the previous upload logs
3. Look for these logs (they should be there):
   ```
   [detector] Detection attributes: { hasPolicyDetails, hasPreviousPolicyField, ... }
   [United India Floater] Pattern 1 (Policy Number XXXXX):
   [United India Floater] Pattern 1 (Previous Policy No. XXXXX):
   [extract] ✅ United India FLOATER policy parsed successfully
   [bulk] SCHEDULE MODE: Checking for policy matches...
   ```

If all these appear: Code is working!

Now upload fresh PDF to test the attachment.

---

## What Was Fixed

1. ✅ **Detection**: Now recognizes space-separated "Policy Number" format
2. ✅ **Parsing**: Extracts both current and previous policy numbers with logging
3. ✅ **API Response**: Returns `mode: "schedule"` (not "annual")
4. ✅ **Matching**: Matches by current OR previous policy number
5. ✅ **Attachment**: Attaches PDF to matched policy, updates address
6. ✅ **Logging**: Comprehensive logs at every step for debugging

---

## If You're Still Stuck

Collect these and share:

1. **Terminal logs** (from upload onwards):
   - Copy everything from `[extract] ✅` to `[bulk] MATCHING SUMMARY`

2. **Browser Network response** (2 screenshots):
   - `/api/extract` → Response tab
   - `/api/policies/bulk` → Response tab

3. **Database check**:
   ```sql
   SELECT policy_number, company FROM policies 
   WHERE policy_number LIKE '0605002826%' 
      OR policy_number LIKE '0605002825%';
   ```

4. **What you expected vs what happened**

Then I can diagnose exactly what's wrong.

---

## Timeline

- **If policy exists**: ~5 min total (restart + verify)
- **If policy needs import**: ~10 min (import Excel + restart + upload)
- **Full end-to-end**: ~15 min including verification

**GO!** ⚡
