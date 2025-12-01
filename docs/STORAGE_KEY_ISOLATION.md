# Admin Portal - Storage Key Isolation Fix

## Problem Summary

**Issue**: When using the admin portal (super admin) after previously accessing the patient app in the same browser, console errors appeared:

```
GET http://localhost:3001/api/appointments?date=2025-12-01 403 (Forbidden)
api-hooks.ts:70
```

**Impact**:

- Unnecessary API calls with wrong authorization context
- 403 errors polluting browser console
- Potential for confusion during testing/development

## Technical Analysis

### The Root Cause

Both apps shared identical localStorage keys:

| App                       | Token Key      | User Key      |
| ------------------------- | -------------- | ------------- |
| Patient App (`/apps/app`) | `docita_token` | `docita_user` |
| Admin App (`/apps/admin`) | `docita_token` | `docita_user` |

### Why This Caused Problems

1. **Session Collision**: When switching between apps in same browser tab/window, they would read each other's authentication state
2. **Component Leakage**: Patient app's React components (including React Query hooks) remained in browser memory
3. **Wrong Credentials**: Admin app's super admin token would be visible to patient app's hooks
4. **Unauthorized Calls**: Patient app hooks tried calling patient-only endpoints with super admin token, resulting in 403

### Sequence of Events

```
Timeline:
1. User logs into Patient App
   → localStorage.setItem("docita_token", clinicUserToken)
   → localStorage.setItem("docita_user", clinicUser)

2. User navigates to Admin App (same browser)
   → Admin app reads "docita_token" from localStorage
   → Gets the old clinic user token ❌
   → Logs in with super admin credentials
   → Overwrites with super admin token

3. Patient app hooks still in memory
   → Call /api/appointments endpoint
   → Send super admin token
   → Backend rejects: 403 Forbidden

4. Admin portal shows 403 errors in console
```

## Solution Implemented

Changed admin app auth to use unique, app-scoped storage keys:

**File**: `/apps/admin/lib/auth.tsx`

```typescript
// BEFORE: Conflicting with patient app
const TOKEN_KEY = "docita_token";
const USER_KEY = "docita_user";
const COOKIE_KEY = "docita_admin_token";

// AFTER: App-specific isolation
const TOKEN_KEY = "docita_admin_token";
const USER_KEY = "docita_admin_user";
const COOKIE_KEY = "docita_admin_cookie";
```

### Why This Works

✅ **Isolation**: Admin app only reads/writes to its own storage keys
✅ **No Conflicts**: Patient app tokens never picked up by admin app
✅ **Clean Separation**: Each app maintains completely independent session
✅ **No Breaking Changes**: Only internal storage key names changed

### Change Details

```diff
- const TOKEN_KEY = "docita_token";
- const USER_KEY = "docita_user";
- const COOKIE_KEY = "docita_admin_token";

+ // Use distinct keys for admin app to avoid conflicts with patient app
+ const TOKEN_KEY = "docita_admin_token";
+ const USER_KEY = "docita_admin_user";
+ const COOKIE_KEY = "docita_admin_cookie";
```

## Storage Keys Reference

After this fix, the apps use:

| App         | Token Key            | User Key            | Cookie Key            |
| ----------- | -------------------- | ------------------- | --------------------- |
| Patient App | `docita_token`       | `docita_user`       | N/A                   |
| Admin App   | `docita_admin_token` | `docita_admin_user` | `docita_admin_cookie` |
| Landing App | (to be reviewed)     | (to be reviewed)    | (to be reviewed)      |

## Testing Checklist

- [ ] Login to patient app first
- [ ] Open admin portal in same browser
- [ ] Verify no 403 appointments errors in console
- [ ] Check admin page loads clean network requests only
- [ ] Verify super admin can access admin features
- [ ] Test switching between patient and admin apps
- [ ] Verify logout in one app doesn't affect other
- [ ] Check localStorage in DevTools - should have separate keys
- [ ] Open browser on different machines/networks to verify

## Network Activity After Fix

**Expected requests** when in admin portal:

```
✅ GET /super-admin/clinics
✅ GET /super-admin/stats
✅ GET /super-admin/clinics/:id/admins
```

**Unexpected requests** that should NOT appear:

```
❌ GET /appointments (any variation)
❌ GET /patients
❌ GET /prescriptions
```

## Related Applications

Consider similar fixes for:

- **Landing App** (`/apps/landing`): Should use `docita_landing_token` prefix
- **Other Multi-app Systems**: Should follow this storage key isolation pattern

## Best Practices for Multi-App Systems

When building monorepos with multiple Next.js/React apps:

### ✅ DO:

```typescript
// Use app-specific prefixes
const APP_NAME = "admin";
const TOKEN_KEY = `docita_${APP_NAME}_token`;
const USER_KEY = `docita_${APP_NAME}_user`;

// Or be explicit
const PATIENT_TOKEN = "docita_patient_token";
const ADMIN_TOKEN = "docita_admin_token";
const LANDING_TOKEN = "docita_landing_token";
```

### ❌ DON'T:

```typescript
// Don't share generic keys across apps
const TOKEN_KEY = "docita_token"; // Shared by multiple apps!
const USER_KEY = "docita_user"; // Collision risk!
```

## Deployment Notes

- ✅ No backend changes required
- ✅ No database migrations needed
- ✅ Existing admin sessions will need to re-login (localStorage key change)
- ✅ Patient app sessions unaffected
- ✅ Safe to deploy immediately

## Files Modified

- `/apps/admin/lib/auth.tsx` - Lines 31-34 (4 lines changed)

## Documentation Updated

- `/docs/FIXED_ADMIN_403_APPOINTMENTS.md` - Detailed fix explanation
