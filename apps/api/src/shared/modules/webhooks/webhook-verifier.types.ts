export type WebhookProvider =
  | 'razorpay'
  | 'meta-whatsapp'
  | 'zeptomail'
  | 'abdm';

export type WebhookAuthMode = 'hmac-body' | 'shared-secret-header';

export interface WebhookVerificationInput {
  provider: WebhookProvider;
  rawBody: Buffer;
  signature: string;
  /**
   * Defaults to HMAC verification of {@link rawBody}. ZeptoMail's primary auth
   * uses a configured Authorization header instead of a body signature.
   */
  authMode?: WebhookAuthMode;
  /** Required when {@link authMode} is `shared-secret-header`. */
  sharedSecretHeader?: string;
  /**
   * Optional pre-computed prefix for HMAC algorithms that emit a
   * versioned signature (e.g. Meta's `sha256=...`).
   */
  signaturePrefix?: string;
  secret: string;
  /**
   * Optional unix timestamp (seconds) provided by the webhook payload
   * or transport header. When present, verification rejects payloads
   * whose timestamp is more than 5 minutes from now to defeat
   * delayed-message attacks.
   */
  signedTimestampSeconds?: number;
}

export type WebhookVerificationFailure =
  | 'missing-secret'
  | 'invalid-signature'
  | 'stale-timestamp'
  | 'replayed';

export interface WebhookVerificationResult {
  ok: boolean;
  failure?: WebhookVerificationFailure;
}
