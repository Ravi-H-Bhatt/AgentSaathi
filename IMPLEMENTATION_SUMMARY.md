# AgentSaathi PWA + Enhanced Upload Implementation

## ✅ COMPLETED FEATURES

### 1. PWA (Progressive Web App)
- **Manifest** (`/manifest.webmanifest`) - makes app installable
- **Icons** - 192px, 512px, apple-icon, favicon (all generated via ImageResponse)
- **Service Worker** (`/sw.js`) - offline shell, network-first caching
- **Offline page** (`/offline`) - shown when navigation fails offline
- **Auto-registration** - ServiceWorkerRegister component in root layout
- **Theme color + viewport** - mobile-optimized metadata

### 2. Push Notifications
- **VAPID keys** - generated and added to `.env.local`
- **Database** - `push_subscriptions` table (migration 0005)
- **Subscribe/unsubscribe** - `/api/push/subscribe`, `/api/push/unsubscribe`
- **Test endpoint** - `/api/push/test` (sends confirmation notification)
- **Toggle UI** - sidebar button to enable/disable notifications
- **Renewal alerts** - cron job sends push when renewal reminders fire
- **Auto-cleanup** - dead subscriptions (410/404) pruned automatically

### 3. Delete Clients
- **Single delete** - `DELETE /api/clients?id=<clientId>`
- **Delete all** - `DELETE /api/clients?all=1`
- **Owner-only** - colleagues are blocked from deleting
- **Cascade** - policies removed via FK, stored PDFs cleaned up
- **UI** - delete button on client detail page + "Delete all" button on clients list
- **Confirmation** - double-confirm prompts before destructive actions

### 4. View & Download Policy PDFs
- **Signed URLs** - `/api/policies/file?policyId=...&download=1`
- **Ownership enforced** - policy must belong to caller's owner
- **UI** - View and Download buttons on each policy in ClientDetail
- **Short-lived links** - 2-minute signed URLs (secure, no permanent exposure)

### 5. Upload Redesign
- **Category dropdown** - Life Insurance (LIC), General Insurance (GIC), Auto-detect
- **Left panel: Single PDF** - drag-drop or click, extracts & shows editable form
- **Right panel: Bundle upload** - multiple e-policy PDFs at once
- **Bundle endpoint** - `/api/policies/upload-bundle` processes each file
- **Per-file summary** - shows saved/duplicate/needs_review/error status per file
- **Deduplication** - globally unique policy numbers + field-by-field matching

### 6. Enhanced Extraction (Groq AI)
- **Category hint** - extraction tuned for LIC vs GIC documents
- **Detailed prompts** - extracts policyholder name (not nominee), company (insurer), current policy number, floater sum insured, net premium, DOB from insured table
- **Indian date parsing** - handles DD/MM/YYYY and DD-MON-YYYY formats
- **Low-confidence flagging** - fields the model is unsure about are marked for review

### 7. Shared Policy Save Logic
- **`savePolicyForOwner` lib** - single source of truth for saving policies
- **Client reuse** - same owner + name (+ DOB/email) = same client
- **Policy dedup** - by globally-unique policy number, or all-fields-identical
- **Used by** - single upload route + bundle route (consistent storage everywhere)

## 📁 NEW FILES CREATED

### PWA & Notifications
- `src/app/manifest.ts` - web app manifest
- `src/app/icon.tsx` - 32x32 favicon
- `src/app/apple-icon.tsx` - 180x180 iOS icon
- `src/app/icon-192.png/route.tsx` - 192px PWA icon
- `src/app/icon-512.png/route.tsx` - 512px PWA icon
- `src/app/offline/page.tsx` - offline fallback page
- `public/sw.js` - service worker (offline + push)
- `src/components/ServiceWorkerRegister.tsx` - client-side SW registration
- `src/components/NotificationToggle.tsx` - sidebar toggle for push
- `src/lib/push.ts` - server-side push helper (sendPushToAgent)
- `src/app/api/push/subscribe/route.ts` - save subscription
- `src/app/api/push/unsubscribe/route.ts` - remove subscription
- `src/app/api/push/test/route.ts` - test notification
- `supabase/migrations/0005_push_subscriptions.sql` - push table migration

### Delete & File Viewing
- `src/app/api/clients/route.ts` - DELETE single or all clients
- `src/app/api/policies/file/route.ts` - signed URL for policy PDFs
- `src/components/DeleteAllClientsButton.tsx` - delete all button on clients list

### Upload & Extraction
- `src/app/api/policies/upload-bundle/route.ts` - multi-file upload endpoint
- `src/lib/policies.ts` - shared `savePolicyForOwner` function
- `src/components/UploadFlow.tsx` - completely redesigned upload UI

## 🗄️ DATABASE CHANGES

Run this migration in Supabase SQL editor:
```sql
-- File: supabase/migrations/0005_push_subscriptions.sql
-- Creates push_subscriptions table with RLS
```

Already reflected in `supabase/schema.sql` (canonical schema is up to date).

## 🔑 ENVIRONMENT VARIABLES ADDED

Added to `.env.example` and `.env.local`:
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
```

## 🎯 EXTRACTION IMPROVEMENTS

The Groq extraction prompt now:
1. Distinguishes life (LIC) vs general (GIC) insurance
2. Extracts the MAIN policyholder (SELF in insured table, not nominee/agent)
3. Captures the INSURER company name (not the agent/office)
4. Uses the CURRENT policy number (not previous)
5. Uses FLOATER sum insured for health policies
6. Uses TOTAL net premium (with GST), not per-member basic premium
7. Parses Indian date formats (DD/MM/YYYY) correctly
8. Extracts DOB from the "Insured Persons details" table (SELF row)

## ✅ TESTING CHECKLIST

1. **Run migration** - Execute `0005_push_subscriptions.sql` in Supabase
2. **Enable notifications** - Click "Enable notifications" in sidebar, allow permission
3. **Test push** - Should get confirmation notification immediately
4. **Upload single PDF** - Select category, drop the New India sample, review extracted fields
5. **Upload bundle** - Select multiple e-policy PDFs, see per-file status
6. **View policy** - Click "View" on a policy with a stored PDF
7. **Download policy** - Click "Download" (should download with proper filename)
8. **Delete client** - Only shown to owners, cascades policies + files
9. **Delete all** - Requires double-confirmation, removes everything
10. **Offline mode** - Disconnect WiFi, reload page, see offline fallback
11. **Install app** - Chrome/Edge: three-dot menu → "Install AgentSaathi"

## 🚀 EVERYTHING IS IMPLEMENTED

✅ PWA with offline shell
✅ Push notifications (with renewal alerts)
✅ Delete clients (single + all, owner-only)
✅ View & download policy PDFs (secure signed URLs)
✅ Upload redesign (LIC/GIC dropdown + bundle)
✅ Enhanced extraction (detailed, category-aware)
✅ Shared save logic (no duplication, correctly stored)

**ALL REQUESTED FEATURES ARE COMPLETE AND READY TO TEST.**
