/**
 * Validates signed/presigned URLs before the browser navigates to them.
 *
 * Signed URLs are bearer tokens — once validated as structurally sound,
 * they should be opened immediately since validation happens before
 * the navigation, not after.
 */

const ALLOWED_SIGNED_URL_PREFIXES = [
  "https://", // same-origin API proxy or R2
  "/", // same-origin relative
];

const SIGNED_URL_REQUIRED_PARAMS = [
  "X-Amz-Signature",
  "X-Amz-Algorithm",
  "X-Amz-Credential",
] as const;

export interface SignedUrlValidationResult {
  valid: boolean;
  reason?: string;
}

function isUrlExpired(url: URL): boolean {
  const expiresParam = url.searchParams.get("X-Amz-Expires");
  const dateParam = url.searchParams.get("X-Amz-Date");
  if (!expiresParam || !dateParam) return false;

  const expiresInSeconds = parseInt(expiresParam, 10);
  if (Number.isNaN(expiresInSeconds)) return false;

  const dateFormat = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
  const match = dateParam.match(dateFormat);
  if (!match) return false;

  const issuedAt = Date.UTC(
    parseInt(match[1], 10),
    parseInt(match[2], 10) - 1,
    parseInt(match[3], 10),
    parseInt(match[4], 10),
    parseInt(match[5], 10),
    parseInt(match[6], 10),
  );
  if (Number.isNaN(issuedAt)) return false;

  return Date.now() > issuedAt + expiresInSeconds * 1000;
}

/**
 * Structurally validates a signed URL (allowed prefix + required query
 * params + not expired). Returns `{ valid: true }` or a reason string.
 */
export function validateSignedUrl(urlString: string): SignedUrlValidationResult {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, reason: "URL_PARSE_FAILED" };
  }

  const hasAllowedPrefix = ALLOWED_SIGNED_URL_PREFIXES.some((prefix) =>
    urlString.startsWith(prefix),
  );
  if (!hasAllowedPrefix) {
    return { valid: false, reason: "DISALLOWED_SCHEME" };
  }

  const missingParams = SIGNED_URL_REQUIRED_PARAMS.filter(
    (param) => !url.searchParams.has(param),
  );
  if (missingParams.length > 0) {
    return { valid: false, reason: "MISSING_SIGNATURE_PARAMS" };
  }

  if (isUrlExpired(url)) {
    return { valid: false, reason: "URL_EXPIRED" };
  }

  return { valid: true };
}

/**
 * Opens a signed URL in a new tab only after structural validation.
 * Silent no-op on invalid URLs (the caller already surfaced a toast).
 */
export function safeOpenSignedUrl(urlString: string): void {
  const result = validateSignedUrl(urlString);
  if (!result.valid) return;
  window.open(urlString, "_blank", "noopener,noreferrer");
}
