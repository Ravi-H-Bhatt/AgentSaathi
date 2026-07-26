# 🚨 CRITICAL - DO THIS NOW

## The Issue (From Your Screenshot)

Your response shows:
```json
{
  "mode": "annual",  // ❌ WRONG - should be "schedule"
  "registerType": "unitedindia-floater",
  "confidence": 0.95
}
```

But the code is correct and returns:
```json
{
  "mode": "schedule",  // ✅ CORRECT
  "registerType": "unitedindia-floater",
  "confidence": 0.95
}
```

**PROBLEM:** Your dev server is running OLD code. The changes haven't been picked up.

---

## ✅ SOLUTION - RESTART DEV SERVER

### Step 1: Stop the Dev Server
1. Go to the terminal where `npm run dev` is running
2. Press `Ctrl+C` to stop it
3. Wait for it to fully stop (should see "^C" in terminal)

### Step 2: Start the Dev Server Again
```bash
npm run dev
```

Wait for:
```
  ▲ Next.js 15.0.0
  - Local: http://localhost:3000
  - ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 3: Hard Refresh Browser
1. Open browser to your app
2. Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) - Hard refresh, clears cache
3. Wait for page to load

### Step 4: Test Again
1. Upload the JHA PDF again
2. Check Network tab:
   - `/api/extract` response should show `"mode": "schedule"` ✅
   - `/api/policies/bulk` should be called automatically
   - Response should show `"matched": true` if policy exists

---

## What Changed in the Code

**File:** `src/app/api/extract/route.ts` (Line 327)

Changed:
```typescript
// BEFORE - Old code that showed "annual"
return NextResponse.json({
  filePath: path,
  fileName: file.name,
  scanned: false,
  mode: extracted.mode || 'Annual',  // ❌ Uses policy mode
  rows: [policyRow],
  ...
});
```

To:
```typescript
// AFTER - Fixed code
return NextResponse.json({
  filePath: path,
  fileName: file.name,
  scanned: false,
  mode: "schedule",  // ✅ Uses API routing mode
  rows: [policyRow],
  ...
});
```

**Why?**
- `extracted.mode` is the POLICY mode (Annual/Monthly) - belongs in policyRow only
- API response `mode` should be "schedule" to tell frontend: "This is a renewal PDF, match/attach it"
- Frontend checks: if `mode === "schedule"` → Auto-call bulk route to match
- Without this, frontend shows import table instead of "Match found"

---

## Expected Flow After Restart

```
1. Upload JHA PDF
   ↓
2. Browser Console shows: [extract] 📄 Will return mode="schedule"
   ↓
3. Network → /api/extract Response:
   {
     "mode": "schedule",  ✅ This is key!
     "rows": [{ 
       "policy_number": "0605002826P103732995",
       "previous_policy_number": "0605002825P103964712",
       ...
     }]
   }
   ↓
4. UploadFlow sees mode="schedule" → Auto-calls /api/policies/bulk
   ↓
5. Network → /api/policies/bulk Request:
   {
     "rows": [...],
     "source_file_path": "agent-id/timestamp.pdf"
   }
   ↓
6. /api/policies/bulk Response:
   {
     "matched": true,  ✅ Policy found
     "attached": 1,    ✅ PDF attached
     "matchedClientName": "JHA BHAWESKUMAR RAMESHCHANDRA"
   }
   ↓
7. UI shows: ✅ Match found
   Message: "Matched an existing policy for 'JHA...'
             This PDF is now attached — open the client and tap 'View' 
             on the policy card to see the full document."
```

---

## Verification Checklist After Restart

- [ ] Restart dev server (Stop old, start new)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Upload JHA PDF
- [ ] Check Console: Logs show `[extract] 📄 Will return mode="schedule"`
- [ ] Check Network tab:
  - [ ] `/api/extract` response includes `"mode": "schedule"`
  - [ ] `/api/policies/bulk` is called
  - [ ] `/api/policies/bulk` response includes `"matched": true`
- [ ] UI shows "✅ Match found" message (NOT import table)
- [ ] Go to Clients → Find JHA client
- [ ] Click policy `0605002826P103732995`
- [ ] "View" button should open the attached PDF

---

## If It Still Doesn't Work

### After restart, if you STILL see `"mode": "annual"`:
1. Check if `/api/extract/route.ts` was actually saved
2. Look for error messages in terminal
3. Try refreshing page in browser
4. Try incognito/private window (to avoid cache)

### If mode="schedule" but still no match:
1. Check if policy exists in database
2. Check bulk route logs for `[bulk] ✅✅✅ MATCH FOUND!`
3. If shows `[bulk] ❌ NO MATCH`, policy hasn't been imported yet
4. Import from Excel first using `Import Policy Data` feature

---

## TL;DR

**DO NOW:**
1. Stop dev server (Ctrl+C)
2. Start dev server (`npm run dev`)
3. Hard refresh browser (Ctrl+Shift+R)
4. Upload PDF again
5. Check Network tab for `"mode": "schedule"`
6. Everything should work ✨
