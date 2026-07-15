# 🔔 Push Notification Fix Guide

## What Was Fixed

1. **Enhanced Service Worker Logging** - Added comprehensive console logs to debug push notification flow
2. **Better iOS Support** - Added iOS-specific PWA metadata and user guidance
3. **Improved Error Handling** - Better error messages and permission handling
4. **Server-Side Logging** - Added logs to track notification sending on backend
5. **Diagnostic Tool** - Created `/test-notifications` page to debug issues

## Critical iOS Requirements

⚠️ **Push notifications on iOS ONLY work if:**

1. **iOS 16.4 or newer** - Earlier versions don't support Web Push API
2. **App installed to Home Screen** - Must use "Share → Add to Home Screen"
3. **Opened from Home Screen** - Don't use Safari tab after installing
4. **Notification permission granted** - Must explicitly allow notifications

## How to Test (Step by Step)

### On iPhone:

1. **Open Safari** and go to your app URL: `https://agent-saathi.vercel.app`

2. **Install to Home Screen**:
   - Tap the Share button (square with arrow)
   - Scroll down and tap "Add to Home Screen"
   - Tap "Add"

3. **Open from Home Screen**:
   - Close Safari completely
   - Open the app from your home screen (it should open fullscreen without Safari UI)

4. **Test Notifications**:
   - Go to `/test-notifications` in the app
   - Follow the 4-step process:
     1. Click "Check Status" - verify PWA mode shows "✅ Yes"
     2. Click "Request Permission" - allow notifications when prompted
     3. Click "Subscribe" - creates push subscription
     4. Click "Send Test" - sends a test notification

5. **Test Real Notifications**:
   - Go to Team Chat and send a message (should notify other team members)
   - Report an issue (should notify admins)

### On Android/Desktop:

1. Open the app in Chrome/Edge
2. Go to `/test-notifications`
3. Follow steps 1-4 above

## Verification Checklist

Use this to verify everything is working:

- [ ] Service worker registered (check console for `[SW] Registered successfully`)
- [ ] PWA installed to home screen (iOS only)
- [ ] Notification permission granted
- [ ] Push subscription created (check with "Check DB" button)
- [ ] Test notification received
- [ ] Team chat notifications working
- [ ] Error report notifications working

## Common Issues & Solutions

### "Notifications not showing"
- **iOS**: Make sure app is installed to home screen and opened from there
- **All**: Check that notification permission is granted in system settings
- **All**: Verify VAPID keys are configured correctly in `.env.local`

### "Permission denied"
- Reset by going to browser settings → Site settings → Notifications
- Delete and reinstall the PWA
- Clear browser cache

### "Service worker not registering"
- Check console for errors
- Make sure you're on HTTPS (required for PWAs)
- Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### "iOS says notifications not supported"
- Verify iOS version is 16.4+
- Make sure you're using Safari (not Chrome on iOS)
- Ensure app is installed to home screen

## Debug Logs

All logs now use prefixes to help debugging:

- `[SW]` - Service worker events
- `[Notifications]` - Client-side notification code
- `[push]` - Server-side push notification sending

Check browser console (F12) and server logs for detailed information.

## Testing Endpoints

- **Diagnostic Page**: `/test-notifications`
- **Test Notification API**: `POST /api/push/test`
- **Subscribe**: `POST /api/push/subscribe`
- **Check Subscriptions**: `GET /api/push/check`

## VAPID Keys

Current VAPID keys in `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHkrP748_UJpdnbroP2uEQ2rx68OZSYF5zSjaWmtSfZGTINDGShDqQuFyy66oDR3A5Su9Bh7nsnvRJBpQXohw24
VAPID_PRIVATE_KEY=w_t45mPCZk-MLTQw73BGhzaZt5jn366mKD7hbDJ-Xtg
```

These are already configured and should work. Don't regenerate unless necessary.

## What Triggers Notifications

1. **Team Chat**: When someone sends a message, all other team members get notified
2. **Error Reports**: When someone reports an issue, all admins get notified
3. **Test Button**: Click "Enable notifications" in sidebar

## Next Steps

1. Deploy these changes to Vercel
2. Test on your iPhone using the steps above
3. Check the `/test-notifications` page for detailed diagnostics
4. Review console logs if issues persist

## Need Help?

If notifications still don't work after following this guide:

1. Check console logs in browser (F12)
2. Check Vercel function logs for server errors
3. Visit `/test-notifications` and share the debug log
4. Verify iOS version and installation method
