export const RATE_LIMIT_HEADER_LIMIT = 'X-RateLimit-Limit';
export const RATE_LIMIT_HEADER_REMAINING = 'X-RateLimit-Remaining';
export const RATE_LIMIT_HEADER_RESET = 'X-RateLimit-Reset';
export const RATE_LIMIT_HEADER_WINDOW = 'X-RateLimit-Window';

export const RATE_LIMIT_BURST_WINDOW_MS = 1_000;
export const RATE_LIMIT_SUSTAINED_WINDOW_MS = 60_000;

export const QUOTA_CACHE_TTL_MS = 60_000;
export const QUOTA_CACHE_KEY_PREFIX = 'tenant-rate-limit:quota:';
export const COUNTER_BURST_KEY_PREFIX = 'tenant-rate-limit:burst:';
export const COUNTER_SUSTAINED_KEY_PREFIX = 'tenant-rate-limit:sustained:';
export const COUNTER_MONTHLY_KEY_PREFIX = 'tenant-rate-limit:monthly:';

/**
 * How many in-cache monthly increments to accumulate before flushing to DB.
 * Trades a small over-count window for far less DB pressure.
 */
export const MONTHLY_FLUSH_BATCH_SIZE = 25;
