import { createBrowserSessionManager } from "@workspace/data-access";
import { API_URL } from "@/lib/api/api-config";

const INTERNAL_LEGACY_TOKEN_KEY = "docita_internal_token";
export const INTERNAL_USER_KEY = "docita_internal_user";

export const internalSession = createBrowserSessionManager({
  apiUrl: API_URL,
  tokenStorageKey: INTERNAL_LEGACY_TOKEN_KEY,
  userStorageKey: INTERNAL_USER_KEY,
  loginPath: "/",
  publicPaths: ["/"],
});
