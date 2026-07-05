import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TurnstileVerifyService } from './turnstile-verify.service';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { TurnstileSiteverifyClient } from '@/domains/public-booking/infrastructure/clients/turnstile-siteverify.client';

describe('TurnstileVerifyService', () => {
  let service: TurnstileVerifyService;
  let secret: string | undefined;
  const verifySiteToken = jest.fn<(...args: unknown[]) => Promise<boolean>>();

  beforeEach(() => {
    jest.clearAllMocks();
    secret = 'turnstile-secret';
    const appConfig = {
      getTurnstileSecretKey: () => secret,
    } as unknown as AppConfigService;
    const client = {
      verifySiteToken,
    } as unknown as TurnstileSiteverifyClient;
    service = new TurnstileVerifyService(appConfig, client);
  });

  it('skips verification (returns true) when no secret is configured — local dev', async () => {
    secret = undefined;
    await expect(service.verifyToken(undefined)).resolves.toBe(true);
    expect(verifySiteToken).not.toHaveBeenCalled();
  });

  it('rejects a missing token when a secret is configured', async () => {
    await expect(service.verifyToken(undefined)).resolves.toBe(false);
    expect(verifySiteToken).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only token without calling the client', async () => {
    await expect(service.verifyToken('   ')).resolves.toBe(false);
    expect(verifySiteToken).not.toHaveBeenCalled();
  });

  it('delegates a trimmed token (with remote ip) to the siteverify client', async () => {
    verifySiteToken.mockResolvedValue(true);
    await expect(
      service.verifyToken('  tok123  ', '203.0.113.5'),
    ).resolves.toBe(true);
    expect(verifySiteToken).toHaveBeenCalledWith(
      'turnstile-secret',
      'tok123',
      '203.0.113.5',
    );
  });

  it('returns false when Cloudflare rejects the token', async () => {
    verifySiteToken.mockResolvedValue(false);
    await expect(service.verifyToken('bad-token')).resolves.toBe(false);
  });
});
