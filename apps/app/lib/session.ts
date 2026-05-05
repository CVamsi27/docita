import { createBrowserSessionManager } from "@workspace/data-access";
import { API_URL } from "./api-config";

export const APP_REDIRECT_AFTER_LOGIN_KEY = "redirectAfterLogin";

export const resolveAppLoginPath = (currentPath: string) =>
  currentPath.startsWith("/portal") ? "/portal/login" : "/login";

export const appSession = createBrowserSessionManager({
  apiUrl: API_URL,
  tokenStorageKey: "docita_token",
  redirectStorageKey: APP_REDIRECT_AFTER_LOGIN_KEY,
  publicPaths: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/portal/login",
    "/book",
  ],
  resolveLoginPath: resolveAppLoginPath,
});
