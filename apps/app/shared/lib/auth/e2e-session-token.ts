/** Playwright sets this in sessionStorage via addInitScript before navigation. */
export const E2E_ACCESS_TOKEN_SESSION_KEY = "__docita_e2e_access_token";

/**
 * Consume a one-shot E2E access token injected by Playwright. Production users
 * never set this key; the helper is a no-op outside E2E runs.
 */
export function consumeE2EAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const token = sessionStorage.getItem(E2E_ACCESS_TOKEN_SESSION_KEY);
    if (!token) {
      return null;
    }
    sessionStorage.removeItem(E2E_ACCESS_TOKEN_SESSION_KEY);
    return token;
  } catch {
    return null;
  }
}
