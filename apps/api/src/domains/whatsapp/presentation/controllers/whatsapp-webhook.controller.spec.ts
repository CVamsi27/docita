import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { HandleWebhookUseCase } from '@/domains/whatsapp/application/use-cases/handle-webhook.use-case';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

describe('WhatsAppWebhookController', () => {
  let controller: WhatsAppWebhookController;

  const mockHandleWebhookUseCase = {
    execute: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockAppConfigService = {
    getMetaConfig: jest.fn(() => ({
      verifyToken: 'verify-token',
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppWebhookController],
      providers: [
        {
          provide: HandleWebhookUseCase,
          useValue: mockHandleWebhookUseCase,
        },
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
      ],
    }).compile();

    controller = module.get<WhatsAppWebhookController>(
      WhatsAppWebhookController,
    );
  });

  describe('verifyWebhook', () => {
    it('returns the challenge when the subscription token is valid', () => {
      expect(
        controller.verifyWebhook({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'verify-token',
          'hub.challenge': 'challenge-token',
        }),
      ).toBe('challenge-token');
    });

    it('throws ForbiddenException when the challenge is missing', () => {
      expect(() =>
        controller.verifyWebhook({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'verify-token',
        }),
      ).toThrow(ForbiddenException);
    });
  });
});
