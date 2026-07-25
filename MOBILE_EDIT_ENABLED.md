# Mobile Number Edit Feature - Now Available for All Sources

## ✅ What Was Done

Enabled editing of mobile numbers **regardless of their source** (manually entered or extracted from PDF).

## Changes Made

### 1. Frontend: `ClientDetail.tsx`

**Before:** Only manually-entered mobile numbers had an "Edit" button.

**After:** ALL mobile numbers (including those extracted from PDFs) now show an "Edit" button.

#### Changes:
- **Line 135-137**: Updated comment to reflect that all phone numbers are now editable
- **Line 341-349**: Removed the conditional `{phoneManual && ...}` wrapper around the Edit button, so it now always appears when a phone number exists

### 2. Backend: `api/clients/route.ts`

The API endpoint already supports updating phone numbers and marks them as `phone_manual: true` after editing.

**Important:** The restriction check that previously prevented editing extracted numbers was already removed from the code. The comment on line 78-79 mentions the restriction, but the actual implementation (lines 81-85) doesn't enforce it.

## How It Works Now

### User Experience:

1. **View Client Page**: When viewing a client, their mobile number is displayed
2. **Click "Edit" Button**: Available for ANY mobile number (extracted or manual)
3. **Enter New Number**: Type or paste a 10-digit mobile number
4. **Save**: The number is validated and saved
5. **After Save**: The number is marked as "manually entered" in the database

### Validation:

- Must be 10 digits
- Must start with 6, 7, 8, or 9 (valid Indian mobile prefixes)
- Automatically strips +91, 91, or 0 prefixes
- Removes all non-digit characters

### Database Update:

When a phone number is edited:
```sql
UPDATE clients 
SET phone = '9876543210', 
    phone_manual = true
WHERE id = 'client-id';
```

The `phone_manual` flag is set to `true`, indicating this number was verified/edited by the agent.

## UI Features Available

When a valid mobile number is present:

1. **Call Link**: Click to dial the number
2. **WhatsApp Button**: Opens WhatsApp with pre-filled policy details
3. **Email Button**: Compose email to client
4. **Edit Button**: Modify the mobile number (NOW AVAILABLE FOR ALL NUMBERS)

## Testing

To test the feature:

1. Navigate to a client who has a mobile number extracted from a PDF
2. You should see the phone number with an "Edit" button
3. Click "Edit"
4. Enter a new 10-digit number
5. Click "Save"
6. Verify the number updates and the edit button remains available

## Technical Notes

### Database Schema

The `clients` table has:
- `phone` (text): The mobile number
- `phone_manual` (boolean): Flag indicating if manually entered/edited

### API Endpoint

**Endpoint:** `PATCH /api/clients`

**Request Body:**
```json
{
  "id": "client-uuid",
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "ok": true,
  "phone": "9876543210",
  "phone_manual": true
}
```

### Permissions

- Requires `clients` permission (owners and colleagues with client access)
- Scoped to agent's workspace
- Can only edit clients belonging to the agent's owner

## Previous Functionality vs New

### Before:
- ❌ PDF-extracted numbers: **View only** (no edit button)
- ✅ Manually-entered numbers: **Editable**

### After:
- ✅ PDF-extracted numbers: **Editable** (edit button appears)
- ✅ Manually-entered numbers: **Editable** (unchanged)

## Related Files

- `/src/components/ClientDetail.tsx` - Client detail page with edit functionality
- `/src/app/api/clients/route.ts` - API endpoint for updating client data
- `/supabase/migrations/0012_client_phone_manual.sql` - Database migration for phone_manual column

## Additional Features Still Available

The bulk mobile number update feature from Excel files is still available:
- See `UPDATE_MOBILE_NUMBERS_GUIDE.md` for details
- Useful for updating multiple clients at once
- Located at `/admin/update-mobile` (if the page is created)

## Summary

All mobile numbers can now be edited directly from the client detail page, providing a seamless experience for agents to correct or update phone numbers regardless of their original source (PDF extraction or manual entry).
