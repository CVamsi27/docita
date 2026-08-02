import { createBrowserSessionManager } from "@workspace/data-access";
import { getAppApiUrl } from "@/lib/api/api-config";

export const APP_REDIRECT_AFTER_LOGIN_KEY = "redirectAfterLogin";

export const resolveAppLoginPath = (currentPath: string) => {
  if (currentPath.startsWith("/portal")) return "/portal/login";
  if (currentPath.startsWith("/lab-portal")) return "/lab-portal/login";
  return "/login";
};

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
    "/portal",
    "/lab-portal",
    "/book",
    "/upload-signature",
    "/mobile-upload",
    "/partner",
    "/verify-email",
    "/visual-test",
    "/e2e-session-seed",
  ],
  resolveLoginPath: resolveAppLoginPath,
});
