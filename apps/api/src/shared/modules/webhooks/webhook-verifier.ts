import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import {
  WebhookVerificationInput,
  WebhookVerificationResult,
  WebhookProvider,
} from '@/shared/modules/webhooks/webhook-verifier.types';
import { WebhookReplayDedupeRepository } from '@/shared/modules/webhooks/webhook-replay-dedupe.repository';

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
const REPLAY_CACHE_TTL_MS = 10 * 60 * 1000;
const REPLAY_CACHE_PREFIX = 'webhook-verifier:replay:';

const computeSignature = (
  secret: string,
  rawBody: Buffer,
  prefix?: string,
): string => {
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  return prefix ? `${prefix}${digest}` : digest;
};

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
};

const buildReplayKey = (
  provider: WebhookProvider,
  signature: string,
  rawBody: Buffer,
  signedTimestampSeconds?: number,
): string => {
  const bodyDigest = createHash('sha256').update(rawBody).digest('hex');
  const tsPart = signedTimestampSeconds ?? '';
  return `${REPLAY_CACHE_PREFIX}${provider}:${tsPart}:${signature}:${bodyDigest}`;
};

@Injectable()
export class WebhookVerifierService {
  private readonly logger = new Logger(WebhookVerifierService.name);

  constructor(
    private readonly dedupeRepository: WebhookReplayDedupeRepository,
  ) {}

  async verify(
    input: WebhookVerificationInput,
  ): Promise<WebhookVerificationResult> {
    if (!input.secret) {
      this.logger.warn(
        `Webhook secret missing for provider ${input.provider}; refusing webhook`,
      );
      return { ok: false, failure: 'missing-secret' };
    }

    if (
      typeof input.signedTimestampSeconds === 'number' &&
      Number.isFinite(input.signedTimestampSeconds)
    ) {
      const drift = Math.abs(
        Math.floor(Date.now() / 1000) - input.signedTimestampSeconds,
      );
      if (drift > TIMESTAMP_TOLERANCE_SECONDS) {
        this.logger.warn(
          `Webhook timestamp out of tolerance for ${input.provider}: drift=${drift}s`,
        );
        return { ok: false, failure: 'stale-timestamp' };
      }
    }

    const expected = computeSignature(
      input.secret,
      input.rawBody,
      input.signaturePrefix,
    );
    if (!safeEqual(expected, input.signature)) {
      return { ok: false, failure: 'invalid-signature' };
    }

    const replayKey = buildReplayKey(
      input.provider,
      input.signature,
      input.rawBody,
      input.signedTimestampSeconds,
    );
    const dedupeKeyHash = createHash('sha256').update(replayKey).digest('hex');
    const expiresAt = new Date(Date.now() + REPLAY_CACHE_TTL_MS);
    const claimed = await this.dedupeRepository.tryClaim(
      dedupeKeyHash,
      expiresAt,
    );
    if (!claimed) {
      this.logger.warn(
        `Replayed webhook detected for provider ${input.provider}`,
      );
      return { ok: false, failure: 'replayed' };
    }
    return { ok: true };
  }
}
