/** Shared browser/API CSRF double-submit contract. */
export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
export const CSRF_RESPONSE_HEADER_NAME = "X-CSRF-Token";

/** Short-lived access JWT; refresh tokens cover long sessions. */
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

/** Refresh token lifetime (30 days). */
export const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
