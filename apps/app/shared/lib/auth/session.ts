import { createBrowserSessionManager } from "@workspace/data-access";
import { getAppApiUrl } from "@/lib/api/api-config";

export const APP_REDIRECT_AFTER_LOGIN_KEY = "redirectAfterLogin";

export const resolveAppLoginPath = (currentPath: string) =>
  currentPath.startsWith("/portal") ? "/portal/login" : "/login";

export const appSession = createBrowserSessionManager({
  apiUrl: "/api/v1",
  resolveApiUrl: getAppApiUrl,
  tokenStorageKey: "docita_token",
  redirectStorageKey: APP_REDIRECT_AFTER_LOGIN_KEY,
  publicPaths: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/portal/login",
    "/book",
    // Per-session-secret / token-authorised QR landing pages. These are
    // opened on a phone with no clinician session (signature & document
    // upload flows), so they must never bounce to /login.
    "/upload-signature",
    "/mobile-upload",
  ],
  resolveLoginPath: resolveAppLoginPath,
});
