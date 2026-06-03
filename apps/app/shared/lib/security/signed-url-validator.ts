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

  return Date.now() > issuedAt + expiresInSeconds * 1000;
}

export function validateSignedUrl(
  url: string,
): SignedUrlValidationResult {
  if (!url || typeof url !== "string") {
    return { valid: false, reason: "URL is empty" };
  }

  if (
    !ALLOWED_SIGNED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))
  ) {
    return {
      valid: false,
      reason: "URL does not start with an allowed prefix",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url, "http://localhost");
  } catch {
    return { valid: false, reason: "URL is malformed" };
  }

  // For signed URLs (R2/presigned), verify required parameters
  const hasSignatureParams = SIGNED_URL_REQUIRED_PARAMS.every((param) =>
    parsed.searchParams.has(param),
  );
  if (parsed.searchParams.has("X-Amz-Signature") && !hasSignatureParams) {
    return {
      valid: false,
      reason: "Signed URL is missing required parameters",
    };
  }

  // For same-origin URLs (API proxy), no signature params needed
  if (
    hasSignatureParams &&
    isUrlExpired(parsed)
  ) {
    return { valid: false, reason: "Signed URL has expired" };
  }

  return { valid: true };
}

/**
 * Validates a signed URL and opens it in a new tab if valid.
 * Returns false if the URL was rejected, true if opened successfully.
 */
export function safeOpenSignedUrl(
  url: string | undefined | null,
): boolean {
  if (!url) return false;

  const result = validateSignedUrl(url);
  if (!result.valid) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        `[Security] Blocked opening invalid signed URL: ${result.reason}`,
      );
    }
    return false;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
