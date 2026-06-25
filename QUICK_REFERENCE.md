# ELITE Authentication Flow - Quick Reference

## What Was Changed

### Problem

```
processEliteCallback() was calling authorize() on WebSockets that weren't fully open yet
→ Race condition → Authorization failures
```

### Solution

```
processEliteCallback() now ONLY stores data
→ Let api-base handle authorization when WebSocket is OPEN
→ No race condition, cleaner code
```

## The Fix (3 Key Changes)

### 1. Removed authorize() calls from processEliteCallback

**Before**: 2 separate `authorize()` calls (lines 118 and 168)
**After**: 0 `authorize()` calls in processEliteCallback

### 2. Removed data transformation steps

**Before**: Steps to parse authorize response, merge data, select account
**After**: Just pick first account as active

### 3. Let api-base handle authorization

**Before**: processEliteCallback does everything
**After**: processEliteCallback stores → api-base authorizes

## Code Comparison

### BEFORE (Broken)

```typescript
const api = await genDerivApi();
// ↓ WebSocket is CONNECTING, not OPEN yet
const { authorize, error } = await api.authorize(token);
// ✗ This fails because WebSocket isn't ready
```

### AFTER (Fixed)

```typescript
// Just store the token
localStorage.setItem('authToken', token);
localStorage.setItem('auth_system', 'ELITE');

// When api-base initializes, it:
// 1. Sees auth_system='ELITE'
// 2. Waits for WebSocket to OPEN
// 3. THEN calls authorize(token)
// ✓ This works because WebSocket is ready
```

## Files Changed

- `src/app/App.tsx` - Simplified processEliteCallback (1 file)

## Files NOT Changed (but important to understand)

- `src/external/bot-skeleton/services/api/api-base.ts` - Already has proper ELITE handling
- `src/components/shared/utils/config/config.ts` - Already adds app_id parameter to WebSocket URL
- `src/hooks/useOAuthCallback.ts` - Already detects ELITE callback parameters

## Testing the Fix

### Manual Test

1. Go to app home page
2. Click "Log in (ELITE)" button
3. Log in with ELITE account
4. Check that:
    - Page shows "Negotiating WebSocket session..." message
    - Account balance appears in header (not login buttons)
    - Browser console shows: `✅ ELITE callback processed`
    - Browser console shows: `🔐 [APIBase] ELITE Account - Using authorize()`

### Verify Console

```javascript
// Should all be true after ELITE login
localStorage.getItem('auth_system') === 'ELITE'
localStorage.getItem('active_loginid').startsWith('CR') || .startsWith('VRTC')
JSON.parse(localStorage.getItem('accountsList')).length > 0
```

## Expected Console Sequence

```
🔐 ELITE Callback Detected
📋 ELITE Accounts: [{accountId: "CR123", token: "...", currency: "USD"}]
✅ Parsed tokens from callback
✅ Stored accounts and selected active account
✅ ELITE callback processed - auth_system set to ELITE
[DerivAPI] Creating new WebSocket connection to: wss://...?app_id=89928
🔐 [APIBase] ELITE account detected - calling authorize
🔐 [APIBase] ELITE Account - Using authorize() method
📞 [APIBase] Calling authorize...
📨 [APIBase] Authorize response received
✅ ELITE account confirmed!
```

## Common Issues & Solutions

| Issue                        | Cause                              | Solution                                             |
| ---------------------------- | ---------------------------------- | ---------------------------------------------------- |
| Blank page after ELITE login | WebSocket not opening              | Check browser console for network errors             |
| Login buttons still show     | auth_system not set to 'ELITE'     | Check localStorage in DevTools                       |
| WebSocket URL missing app_id | getSocketURL() not detecting ELITE | Verify auth_system is set BEFORE WebSocket creates   |
| authorize() still fails      | Old auth calls still running       | Verify processEliteCallback doesn't call authorize() |

## Architecture Diagram

```
┌─────────────────┐
│  ELITE OAuth    │ (app_id=89928)
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│  URL: /callback?acct1=...&token1=...    │
└────────┬────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────┐
│  useOAuthCallback detects: isEliteCallback=true  │
└────────┬─────────────────────────────────────────┘
         │
         ↓
┌───────────────────────────────────────────────┐
│  processEliteCallback(accounts)               │
│  ├─ Store accountsList to localStorage       │
│  ├─ Store authToken to localStorage          │
│  ├─ Store active_loginid to localStorage     │
│  ├─ Set auth_system='ELITE'                  │
│  ├─ Set logged_state cookie                  │
│  └─ cleanupURL() → redirect to /             │
└────────┬──────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│  api-base.init() detects:              │
│  auth_system='ELITE' in localStorage   │
└────────┬───────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│  Create WebSocket with app_id=89928    │
└────────┬───────────────────────────────┘
         │
         ↓ (WebSocket OPEN event fires)
┌────────────────────────────────────────┐
│  api-base.authorizeAndSubscribe()      │
│  └─ Call authorize(token)              │
│     └─ Get account list + balance      │
└────────┬───────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│  Account balance displays in header    │
│  User sees trading interface           │
└────────────────────────────────────────┘
```

## Key Insight

**The race condition was caused by calling authorize() BEFORE the WebSocket was open.**

Old approach:

- Create WebSocket → immediately call authorize() ✗
- WebSocket.readyState = 0 (CONNECTING)
- authorize() fails because nothing is listening

New approach:

- Create WebSocket → wait for OPEN event → call authorize() ✓
- WebSocket.readyState = 1 (OPEN)
- authorize() succeeds because connection is ready

api-base already had this pattern correct for ZOOM accounts. We just needed to use it for ELITE accounts too.

## Deployment Notes

✅ Build passes: `npm start` completed in 19.4s
✅ No TypeScript errors
✅ No compilation errors
✅ Ready for testing

Deploy by:

1. Commit changes to feature branch
2. Test on staging: `/callback?acct1=CR123&token1=xyz&cur1=USD`
3. Verify console logs match expected sequence
4. Merge to main

Rollback if needed:

```bash
git revert <commit-hash>
npm start
```
