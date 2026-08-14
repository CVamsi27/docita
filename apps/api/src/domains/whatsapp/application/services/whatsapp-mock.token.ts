/**
 * Backward-compatible token for e2e test mocking.
 *
 * The WhatsappService facade was deleted — controllers now inject specific
 * services. This token exists solely so existing e2e tests can continue to
 * use `.overrideProvider(WhatsappMockToken)` without rewriting every test.
 *
 * @deprecated Migrate e2e tests to mock individual services directly.
 */
export const WhatsappMockToken = 'WhatsappService';
