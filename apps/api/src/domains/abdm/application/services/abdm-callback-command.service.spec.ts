import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AbdmGatewayCallback } from '@workspace/types';
import type { AbdmExchangeService } from '@/domains/abdm/application/services/abdm-exchange.service';
import type { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import type { WebhookVerifierService } from '@/shared/modules/webhooks';
import { AbdmCallbackCommandService } from './abdm-callback-command.service';

describe('AbdmCallbackCommandService', () => {
  const exchange = {
    recordGatewayCallback: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<AbdmExchangeService, 'recordGatewayCallback'>
  >;
  const integrationsConfig = {
    getAbdmConfig: jest.fn(),
  } as unknown as jest.Mocked<ExternalIntegrationsConfigService>;
  const webhookVerifier = {
    verify: jest.fn(),
  } as unknown as jest.Mocked<Pick<WebhookVerifierService, 'verify'>>;

  const service = new AbdmCallbackCommandService(
    exchange as unknown as AbdmExchangeService,
    integrationsConfig as unknown as ExternalIntegrationsConfigService,
    webhookVerifier as unknown as WebhookVerifierService,
  );

  const callback: AbdmGatewayCallback = {
    requestId: 'req-1',
    transactionId: 'txn-1',
    patientId: 'patient-1',
    careContextReference: 'DOCITA-PRESCRIPTION-rx-1',
    status: 'SUCCEEDED',
    payload: { consentId: 'consent-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    integrationsConfig.getAbdmConfig.mockReturnValue({
      baseUrl: null,
      clientId: null,
      clientSecret: null,
      callbackSecret: 'cb-secret',
      abhaBaseUrl: 'https://abhasbx.abdm.gov.in',
      abhaPublicKey: null,
      isSandbox: false,
      enabled: false,
    });
    webhookVerifier.verify.mockResolvedValue({ ok: true });
    exchange.recordGatewayCallback.mockResolvedValue({
      id: 'tx-1',
      patientId: 'patient-1',
      careContextId: 'ctx-1',
      type: 'M3_CONSENT_CALLBACK',
      direction: 'INBOUND',
      status: 'ACKNOWLEDGED',
      requestId: 'req-1',
      transactionId: 'txn-1',
      correlationId: 'DOCITA-PRESCRIPTION-rx-1',
      error: null,
      retryCount: 0,
      nextRetryAt: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
  });

  it('verifies the shared-secret header against the configured ABDM callback secret', async () => {
    await service.recordCallback({
      clinicId: 'clinic-1',
      type: 'consent',
      rawBody: Buffer.from('{}'),
      sharedSecretHeader: 'x-callback-secret',
      timestamp: '1786000000',
      callback,
    });

    expect(webhookVerifier.verify).toHaveBeenCalledWith({
      provider: 'abdm',
      rawBody: Buffer.from('{}'),
      signature: '',
      authMode: 'shared-secret-header',
      sharedSecretHeader: 'x-callback-secret',
      secret: 'cb-secret',
      signedTimestampSeconds: 1786000000,
    });
  });

  it('passes an undefined signed timestamp when the callback omits it', async () => {
    await service.recordCallback({
      clinicId: 'clinic-1',
      type: 'consent',
      rawBody: Buffer.from('{}'),
      callback,
    });

    expect(webhookVerifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({ signedTimestampSeconds: undefined }),
    );
  });

  it('records the callback through the exchange and returns ok on success', async () => {
    const result = await service.recordCallback({
      clinicId: 'clinic-1',
      type: 'consent',
      rawBody: Buffer.from('{}'),
      sharedSecretHeader: 'x-callback-secret',
      callback,
    });

    expect(result).toEqual({ status: 'ok' });
    expect(exchange.recordGatewayCallback).toHaveBeenCalledWith(
      'clinic-1',
      'consent',
      callback,
    );
  });

  it('rejects replayed callbacks with a conflict', async () => {
    webhookVerifier.verify.mockResolvedValue({
      ok: false,
      failure: 'replayed',
    });

    await expect(
      service.recordCallback({
        clinicId: 'clinic-1',
        type: 'consent',
        rawBody: Buffer.from('{}'),
        sharedSecretHeader: 'x-callback-secret',
        callback,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(exchange.recordGatewayCallback).not.toHaveBeenCalled();
  });

  it.each(['missing-secret', 'stale-timestamp', 'invalid-signature'] as const)(
    'rejects callbacks whose verification fails with %s',
    async (failure) => {
      webhookVerifier.verify.mockResolvedValue({ ok: false, failure });

      await expect(
        service.recordCallback({
          clinicId: 'clinic-1',
          type: 'consent',
          rawBody: Buffer.from('{}'),
          sharedSecretHeader: 'wrong-secret',
          callback,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(exchange.recordGatewayCallback).not.toHaveBeenCalled();
    },
  );
});
