import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappClientService } from './whatsapp-client.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ServiceUnavailableException, Logger } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('WhatsappClientService', () => {
  let service: WhatsappClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappClientService,
        {
          provide: AppConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({
              WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
              WHATSAPP_ACCESS_TOKEN: 'test-token',
            }),
            getMetaConfig: jest.fn().mockReturnValue({
              phoneNumberId: 'test-phone-id',
              accessToken: 'test-token',
              appSecret: 'test-secret',
              verifyToken: 'test-verify-token',
              productionMode: false,
            }),
            getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
            getEnvironment: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappClientService>(WhatsappClientService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should throw ServiceUnavailableException when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network Error'));

      Object.defineProperty(service, 'phoneNumberId', { value: 'test' });
      Object.defineProperty(service, 'accessToken', { value: 'test' });

      await expect(
        service.sendMessage({ to: '1234567890', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when API returns error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: 'API Error' } }),
      });

      Object.defineProperty(service, 'phoneNumberId', { value: 'test' });
      Object.defineProperty(service, 'accessToken', { value: 'test' });

      await expect(
        service.sendMessage({ to: '1234567890', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
