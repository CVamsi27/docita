import { ForbiddenException, Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request } from 'express';
import { asType } from '@/test-utils/as-type';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

describe('WhatsAppWebhookController', () => {
  let controller: WhatsAppWebhookController;

  const handleWebhookUseCase = {
    execute: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const configService = {
    getMetaConfig: jest.fn(() => ({
      verifyToken: 'verify-token',
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    controller = new WhatsAppWebhookController(
      asType<HandleWebhookUseCase>(handleWebhookUseCase),
      asType<AppConfigService>(configService),
    );
  });

  it('ignores empty crawler requests without throwing', () => {
    expect(controller.verifyWebhook({ query: {} } as unknown as Request)).toBe(
      'OK',
    );
    expect(configService.getMetaConfig).toHaveBeenCalled();
  });

  it('returns the webhook challenge when verification succeeds', () => {
    expect(
      controller.verifyWebhook({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'verify-token',
          'hub.challenge': '123456',
        },
      } as unknown as Request),
    ).toBe('123456');
  });

  it('throws ForbiddenException when the challenge is missing', () => {
    expect(() =>
      controller.verifyWebhook({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'verify-token',
        },
      } as unknown as Request),
    ).toThrow(ForbiddenException);
  });

  it('rejects invalid verification attempts', () => {
    expect(() =>
      controller.verifyWebhook({
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': '123456',
        },
      } as unknown as Request),
    ).toThrow(ForbiddenException);
  });
});
