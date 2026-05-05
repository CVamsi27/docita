export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_METADATA_KEY = 'requires_idempotency_metadata';
export const IDEMPOTENCY_TTL_SECONDS_DEFAULT = 24 * 60 * 60;
export const IDEMPOTENCY_PROCESSING_TTL_SECONDS = 60;

/**
 * RFC 4122 UUID v4 (random) in canonical form. Matches both lower and upper
 * case to be permissive with client-side generators that may differ.
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
