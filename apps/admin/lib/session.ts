import { createBrowserSessionManager } from "@workspace/data-access";
import { API_URL } from "@/lib/api-config";

export const ADMIN_TOKEN_KEY = "docita_admin_token";
export const ADMIN_USER_KEY = "docita_admin_user";
export const ADMIN_COOKIE_KEY = "docita_admin_cookie";

export const adminSession = createBrowserSessionManager({
  apiUrl: API_URL,
  tokenStorageKey: ADMIN_TOKEN_KEY,
  userStorageKey: ADMIN_USER_KEY,
  loginPath: "/",
  publicPaths: ["/"],
});
