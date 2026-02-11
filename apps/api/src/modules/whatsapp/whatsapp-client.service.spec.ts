import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappClientService } from './whatsapp-client.service';
import { ServiceUnavailableException, Logger } from '@nestjs/common';

describe('WhatsappClientService', () => {
  let service: WhatsappClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsappClientService],
    }).compile();

    service = module.get<WhatsappClientService>(WhatsappClientService);
    // Mock logger to avoid clutter
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

      // Initialize with config to bypass "skipped-no-config" check
      Object.defineProperty(service, 'phoneNumberId', { value: 'test' });
      Object.defineProperty(service, 'accessToken', { value: 'test' });

      await expect(
        service.sendMessage({ to: '1234567890', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when API returns error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'API Error' } }),
      });

      Object.defineProperty(service, 'phoneNumberId', { value: 'test' });
      Object.defineProperty(service, 'accessToken', { value: 'test' });

      await expect(
        service.sendMessage({ to: '1234567890', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
