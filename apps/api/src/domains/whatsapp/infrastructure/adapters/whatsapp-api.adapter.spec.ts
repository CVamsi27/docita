import {
  describe,
  it,
  expect,
  jest,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
} from '@jest/globals';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WhatsappClientAdapter } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.adapter';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

function makeSuccessResponse(messageId: string) {
  return new Response(JSON.stringify({ messages: [{ id: messageId }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function makeErrorResponse(errorMessage: string, status = 400) {
  return new Response(JSON.stringify({ error: { message: errorMessage } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('WhatsappClientAdapter (IWhatsAppClient)', () => {
  let adapter: WhatsappClientAdapter;
  let mockConfigService: AppConfigService;
  let getMetaConfigMock: jest.MockedFunction<AppConfigService['getMetaConfig']>;
  let originalFetch: typeof global.fetch;
  let loggerErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterAll(() => {
    loggerErrorSpy.mockRestore();
  });

  beforeEach(async () => {
    originalFetch = global.fetch;

    mockConfigService = Object.create(
      AppConfigService.prototype,
    ) as AppConfigService;
    getMetaConfigMock = jest
      .fn<AppConfigService['getMetaConfig']>()
      .mockReturnValue({
        accessToken: 'test-access-token',
        phoneNumberId: 'test-phone-id',
        businessAccountId: 'biz-id',
        appSecret: 'secret',
        verifyToken: 'verify',
        productionMode: false,
      });
    mockConfigService.getMetaConfig = getMetaConfigMock;

    const module = await Test.createTestingModule({
      providers: [
        WhatsappClientAdapter,
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    adapter = module.get<WhatsappClientAdapter>(WhatsappClientAdapter);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('sendMessage (text)', () => {
    it('should send a text message and return externalId', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeSuccessResponse('wamid.abc123'));

      const result = await adapter.sendMessage({
        to: '919876543210',
        text: 'Hello',
      });

      expect(result.externalId).toBe('wamid.abc123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test-phone-id/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        }),
      );
    });

    it('should normalize 10-digit phone number with country code', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeSuccessResponse('wamid.norm'));

      await adapter.sendMessage({ to: '9876543210', text: 'Hi' });

      const body = JSON.parse(
        (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]
          ?.body as string,
      );
      expect(body.to).toBe('919876543210');
    });

    it('should throw ServiceUnavailableException on API error response', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeErrorResponse('Invalid phone'));

      await expect(
        adapter.sendMessage({ to: '919876543210', text: 'Hi' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException on network error', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('Network failure'));

      await expect(
        adapter.sendMessage({ to: '919876543210', text: 'Hi' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should return skipped externalId when credentials not configured', async () => {
      global.fetch = jest.fn<typeof fetch>();
      getMetaConfigMock.mockReturnValue({
        accessToken: '',
        phoneNumberId: '',
        businessAccountId: '',
        appSecret: '',
        verifyToken: '',
        productionMode: false,
      });

      const unconfiguredModule = await Test.createTestingModule({
        providers: [
          WhatsappClientAdapter,
          { provide: AppConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const unconfiguredAdapter = unconfiguredModule.get<WhatsappClientAdapter>(
        WhatsappClientAdapter,
      );

      const result = await unconfiguredAdapter.sendMessage({
        to: '919876543210',
        text: 'Hi',
      });
      expect(result.externalId).toMatch(/^skipped-/);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage (template)', () => {
    it('should send a template message', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeSuccessResponse('wamid.tmpl01'));

      const result = await adapter.sendMessage({
        to: '919876543210',
        templateName: 'appointment_reminder',
        languageCode: 'en',
        components: [
          { type: 'body', parameters: [{ type: 'text', text: 'John' }] },
        ],
      });

      expect(result.externalId).toBe('wamid.tmpl01');
      const body = JSON.parse(
        (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]
          ?.body as string,
      );
      expect(body.type).toBe('template');
      expect(body.template.name).toBe('appointment_reminder');
    });
  });

  describe('sendInteractiveMessage', () => {
    it('should send interactive buttons message', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeSuccessResponse('wamid.int01'));

      const result = await adapter.sendInteractiveMessage({
        to: '919876543210',
        bodyText: 'Confirm your appointment?',
        buttons: [
          { id: 'btn_confirm', title: 'Confirm' },
          { id: 'btn_cancel', title: 'Cancel' },
        ],
      });

      expect(result.externalId).toBe('wamid.int01');
      const body = JSON.parse(
        (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]
          ?.body as string,
      );
      expect(body.type).toBe('interactive');
      expect(body.interactive.type).toBe('button');
    });

    it('should limit buttons to max 3', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeSuccessResponse('wamid.int02'));

      await adapter.sendInteractiveMessage({
        to: '919876543210',
        bodyText: 'Choose:',
        buttons: [
          { id: 'b1', title: 'Option 1' },
          { id: 'b2', title: 'Option 2' },
          { id: 'b3', title: 'Option 3' },
          { id: 'b4', title: 'Option 4' },
        ],
      });

      const body = JSON.parse(
        (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]
          ?.body as string,
      );
      expect(body.interactive.action.buttons).toHaveLength(3);
    });

    it('should truncate button titles to 20 characters', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeSuccessResponse('wamid.int03'));

      await adapter.sendInteractiveMessage({
        to: '919876543210',
        bodyText: 'Choose:',
        buttons: [{ id: 'b1', title: 'This is a very long button title' }],
      });

      const body = JSON.parse(
        (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]
          ?.body as string,
      );
      expect(body.interactive.action.buttons[0].reply.title).toHaveLength(20);
    });

    it('should throw ServiceUnavailableException on API error', async () => {
      global.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(makeErrorResponse('Bad request', 400));

      await expect(
        adapter.sendInteractiveMessage({
          to: '919876543210',
          bodyText: 'Test',
          buttons: [{ id: 'b1', title: 'OK' }],
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('checkHealth', () => {
    it('should return true when credentials are configured', async () => {
      const healthy = await adapter.checkHealth();
      expect(healthy).toBe(true);
    });

    it('should return false when credentials are missing', async () => {
      getMetaConfigMock.mockReturnValue({
        accessToken: '',
        phoneNumberId: '',
        businessAccountId: '',
        appSecret: '',
        verifyToken: '',
        productionMode: false,
      });

      const unconfiguredModule = await Test.createTestingModule({
        providers: [
          WhatsappClientAdapter,
          { provide: AppConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const unconfigured = unconfiguredModule.get<WhatsappClientAdapter>(
        WhatsappClientAdapter,
      );

      const healthy = await unconfigured.checkHealth();
      expect(healthy).toBe(false);
    });
  });
});
