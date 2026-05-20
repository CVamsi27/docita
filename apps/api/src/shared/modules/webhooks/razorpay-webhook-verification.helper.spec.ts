import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { assertVerifiedRazorpayWebhook } from './razorpay-webhook-verification.helper';
import type { WebhookVerifierService } from './webhook-verifier';

describe('assertVerifiedRazorpayWebhook', () => {
  const verifier = {
    verify: jest.fn(),
  } as unknown as WebhookVerifierService;

  beforeEach(() => {
    jest.mocked(verifier.verify).mockReset();
  });

  it('returns raw body when verification succeeds', async () => {
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    jest.mocked(verifier.verify).mockResolvedValue({ ok: true });

    const result = await assertVerifiedRazorpayWebhook({
      req: { rawBody },
      signature: 'sig',
      secret: 'secret',
      verifier,
    });

    expect(result).toBe(rawBody);
  });

  it('throws when signature is missing', async () => {
    await expect(
      assertVerifiedRazorpayWebhook({
        req: { rawBody: Buffer.from('{}') },
        signature: undefined,
        secret: 'secret',
        verifier,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws conflict on replay', async () => {
    jest
      .mocked(verifier.verify)
      .mockResolvedValue({ ok: false, failure: 'replayed' });

    await expect(
      assertVerifiedRazorpayWebhook({
        req: { rawBody: Buffer.from('{}') },
        signature: 'sig',
        secret: 'secret',
        verifier,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws unauthorized on invalid signature', async () => {
    jest
      .mocked(verifier.verify)
      .mockResolvedValue({ ok: false, failure: 'invalid-signature' });

    await expect(
      assertVerifiedRazorpayWebhook({
        req: { rawBody: Buffer.from('{}') },
        signature: 'sig',
        secret: 'secret',
        verifier,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
