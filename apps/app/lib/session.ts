import { createBrowserSessionManager } from "@workspace/data-access";
import { API_URL } from "./api-config";

export const appSession = createBrowserSessionManager({
  apiUrl: API_URL,
  tokenStorageKey: "docita_token",
  userStorageKey: "docita_user",
});
