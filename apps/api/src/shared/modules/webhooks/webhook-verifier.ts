import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import {
  WebhookVerificationInput,
  WebhookVerificationResult,
  WebhookProvider,
} from '@/shared/modules/webhooks/webhook-verifier.types';

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

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

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
    const seen = await this.cache.get<boolean>(replayKey);
    if (seen) {
      this.logger.warn(
        `Replayed webhook detected for provider ${input.provider}`,
      );
      return { ok: false, failure: 'replayed' };
    }
    await this.cache.set(replayKey, true, REPLAY_CACHE_TTL_MS);
    return { ok: true };
  }
}
