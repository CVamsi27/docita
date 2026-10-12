/**
 * Loaded only by `jest-e2e.json` before `setup-env.ts`.
 * Disables auth IP rate limiting for the in-process E2E app so sequential
 * logins from a single client IP do not hit production limits (see IpRateLimitGuard).
 */
process.env.DOCITA_API_E2E = 'true';

/**
 * Checkout refuses to run without a Razorpay key id, returning 503 before any
 * gateway or persistence side effect — an unconfigured environment must not
 * mint orphan orders and pending payment rows.
 *
 * That guard is correct in production but blocks in-process E2E specs, which
 * supply their own `PAYMENT_GATEWAY_TOKEN` mock and never contact Razorpay. A
 * dummy key satisfies the configuration precondition only; no request is made
 * with it, and the guard still fires wherever the variable is genuinely absent.
 */
process.env.RAZORPAY_KEY_ID ??= 'rzp_test_e2e_key';
