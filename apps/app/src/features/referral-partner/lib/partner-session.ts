// check-as-cast-density: allow-file — the partner session blob is
// JSON-roundtripped from localStorage and re-hydrated; the inline
// cast is the trust boundary that pairs with the JSON.parse below.

import { partnerApi } from "@workspace/data-access";

/**
 * Local session for the partner self-service portal. The partner is a
 * separate audience from the main app user — different storage key,
 * different cookie behavior, and a different audience on the JWT.
 * Mirrors the role/audience separation done by `appSession` in
 * `@/lib/auth/session` for the main app.
 *
 * The refresh token is NOT stored here — it lives in an httpOnly cookie
 * (`partner_refresh_token`) set by the server on verify-otp. The browser
 * sends it automatically on partner-auth refresh requests; JavaScript
 * never sees it (XSS-safe). The access token (15-min TTL) stays in
 * localStorage for use as a Bearer header on portal reads.
 *
 * CSRF protection: partner auth endpoints use cookie-based auth (no
 * Bearer header on refresh), so the CSRF double-submit applies. The
 * XSRF-TOKEN cookie is httpOnly; the CSRF token is mirrored via the
 * X-CSRF-Token response header and captured in memory here for echo.
 */

const STORAGE_KEY = "docita_partner_session";

interface PartnerSessionShape {
  accessToken: string;
  referrerId: string;
  name: string;
  code: string;
  type: "CLINIC" | "PHARMACY" | "MARKETING_PERSON" | "CUSTOM";
  /** Epoch ms when the access token expires. */
  expiresAt: number;
}

// CSRF token captured from response headers and echoed back on mutations.
let csrfToken: string | null = null;

function readPersisted(): PartnerSessionShape | null {
  if (typeof window === "undefined") return null;
  const sessionRaw = window.localStorage.getItem(STORAGE_KEY);
  if (!sessionRaw) return null;
  try {
    return JSON.parse(sessionRaw) as PartnerSessionShape;
  } catch {
    return null;
  }
}

function writePersisted(state: PartnerSessionShape | null): void {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const partnerSession = {
  get(): PartnerSessionShape | null {
    return readPersisted();
  },
  getAccessToken(): string | null {
    const persisted = readPersisted();
    if (!persisted) return null;
    if (persisted.expiresAt <= Date.now()) return null;
    return persisted.accessToken;
  },
  set(session: PartnerSessionShape): void {
    writePersisted(session);
  },
  setAccessToken(accessToken: string, expiresAt: number): void {
    const persisted = readPersisted();
    if (!persisted) return;
    writePersisted({ ...persisted, accessToken, expiresAt });
  },
  clear(): void {
    writePersisted(null);
    csrfToken = null;
  },
  /** CSRF token for double-submit (read from X-CSRF-Token response header). */
  getCsrfToken(): string | null {
    return csrfToken;
  },
  /** Capture the CSRF token from a response's X-CSRF-Token header. */
  captureCsrfToken(token: string | null): void {
    csrfToken = token;
  },
  /** Bootstrap the CSRF token via the data-access health probe. */
  async bootstrapCsrfToken(): Promise<void> {
    if (csrfToken) return;
    const captured = await partnerApi.bootstrapCsrfToken();
    if (captured && captured.length > 0) {
      csrfToken = captured;
    }
  },
};


