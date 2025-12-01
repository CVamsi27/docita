# Fixed: 403 Forbidden Appointments API Calls in Admin Portal

## Issue

When accessing the admin portal (super admin) after previously using the patient app, the browser console showed repeated 403 errors:

```
GET http://localhost:3001/api/appointments?date=2025-12-01 403 (Forbidden)
api-hooks.ts:70
```

These calls were being made even though the appointments endpoint should never be called in the admin/super admin portal context.

## Root Cause

Both the **patient app** (`/apps/app`) and **admin app** (`/apps/admin`) were using the **same localStorage keys** for authentication tokens:

```typescript
// Patient App (apps/app/lib/auth-context.tsx)
localStorage.getItem("docita_token");
localStorage.getItem("docita_user");

// Admin App (apps/admin/lib/auth.tsx) - BEFORE FIX
const TOKEN_KEY = "docita_token"; // ❌ SAME KEY!
const USER_KEY = "docita_user"; // ❌ SAME KEY!
```

### What Happened

1. User logged into **patient app** with a clinic user credential
   - Stored `docita_token` (clinic user token) in localStorage
   - Stored `docita_user` in localStorage

2. User navigated to **admin portal** and logged in with super admin credentials
   - Admin app read the same `docita_token` from localStorage
   - Since it was now a super admin token, it validated successfully
   - But the browser still had references to patient app components/hooks in memory

3. Patient app's React Query hooks (`/apps/app/lib/api-hooks.ts`) that were loaded in the browser
   - Still had cached references to the old token
   - Tried to call the appointments endpoint with the super admin token
   - Backend rejected it with 403 (super admin isn't authorized to access patient endpoints)

## Solution

Changed the admin app to use **distinct localStorage keys** to completely isolate from the patient app:

```typescript
// Admin App (apps/admin/lib/auth.tsx) - AFTER FIX
const TOKEN_KEY = "docita_admin_token"; // ✅ UNIQUE KEY
const USER_KEY = "docita_admin_user"; // ✅ UNIQUE KEY
const COOKIE_KEY = "docita_admin_cookie"; // ✅ UNIQUE KEY
```

### Why This Works

- Each app now maintains its own separate authentication state
- Switching between apps no longer causes localStorage conflicts
- Patient app token is never accidentally picked up by admin app
- Each app's React components/hooks only see their own tokens

## File Changed

`/apps/admin/lib/auth.tsx` (lines 31-33)

```diff
- const TOKEN_KEY = "docita_token";
- const USER_KEY = "docita_user";
- const COOKIE_KEY = "docita_admin_token";

+ // Use distinct keys for admin app to avoid conflicts with patient app
+ const TOKEN_KEY = "docita_admin_token";
+ const USER_KEY = "docita_admin_user";
+ const COOKIE_KEY = "docita_admin_cookie";
```

## Testing

After this fix:

1. ✅ Login to patient app first, then admin app - no 403 errors
2. ✅ Admin portal admin/admins page loads without error calls
3. ✅ Each app maintains isolated session state
4. ✅ Switching between apps in browser tabs doesn't cause conflicts
5. ✅ Console shows only expected API calls (super-admin/\* endpoints)

## Best Practice

Multi-app monorepos using shared storage should use **app-specific prefixes** or **namespaces** for storage keys:

```typescript
// Good: App-specific keys
const PATIENT_TOKEN = "docita_patient_token";
const ADMIN_TOKEN = "docita_admin_token";
const LANDING_TOKEN = "docita_landing_token";

// Or use namespace prefix
const TOKEN_KEY = `${APP_NAME}_token`; // "admin_token", "patient_token"
```

## Related Files

- Admin Auth: `/apps/admin/lib/auth.tsx`
- Patient Auth: `/apps/app/lib/auth-context.tsx`
- Patient API Hooks: `/apps/app/lib/api-hooks.ts` (line 70)
