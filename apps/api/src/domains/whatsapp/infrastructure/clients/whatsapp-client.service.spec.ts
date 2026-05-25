import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappClientService } from './whatsapp-client.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ServiceUnavailableException, Logger } from '@nestjs/common';
import {
  afterEach,
  beforeEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('WhatsappClientService', () => {
  let service: WhatsappClientService;
  let originalFetch: typeof global.fetch;

  const mockMetaConfig = {
    phoneNumberId: 'test-phone-id',
    accessToken: 'test-token',
    appSecret: 'test-secret',
    verifyToken: 'test-verify-token',
    productionMode: false,
  };

  beforeEach(async () => {
    originalFetch = global.fetch;

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
            getMetaConfig: jest.fn().mockReturnValue(mockMetaConfig),
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

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendTextMessage', () => {
    beforeEach(() => {
      Object.defineProperty(service, 'phoneNumberId', {
        value: 'test-phone-id',
        writable: true,
      });
      Object.defineProperty(service, 'accessToken', {
        value: 'test-token',
        writable: true,
      });
    });

    it('should successfully send a message and return messageId', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.abc123' }],
            }),
        }) as typeof fetch;

      const result = await service.sendTextMessage({
        to: '+919876543210',
        message: 'Your appointment is confirmed',
      });

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test-phone-id'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('test-token'),
          }),
        }),
      );
    });

    it('should throw ServiceUnavailableException when fetch fails (network error)', async () => {
      global.fetch = jest.fn().mockImplementation(async () => {
        throw new Error('Network Error');
      }) as typeof fetch;

      await expect(
        service.sendTextMessage({ to: '1234567890', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when API returns non-ok status', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              error: { message: 'Invalid parameter', code: 100 },
            }),
        }) as typeof fetch;

      await expect(
        service.sendTextMessage({ to: '1234567890', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException on 429 rate limit', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: false,
          status: 429,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              error: {
                message: 'Application request limit reached',
                code: 4,
                error_subcode: 2018109,
              },
            }),
        }) as typeof fetch;

      await expect(
        service.sendTextMessage({ to: '9876543210', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when template is not found on Meta', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              error: {
                message: 'Template does not exist in the namespace',
                code: 132001,
              },
            }),
        }) as typeof fetch;

      await expect(
        service.sendTextMessage({
          to: '9876543210',
          message: 'appointment_reminder_24hr',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException for invalid phone number format', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              error: {
                message: 'Invalid phone number',
                code: 131030,
              },
            }),
        }) as typeof fetch;

      await expect(
        service.sendTextMessage({ to: 'invalid-phone', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException on 500 server error', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: false,
          status: 500,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              error: { message: 'Internal server error' },
            }),
        }) as typeof fetch;

      await expect(
        service.sendTextMessage({ to: '9876543210', message: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('sendTemplate', () => {
    beforeEach(() => {
      Object.defineProperty(service, 'phoneNumberId', {
        value: 'test-phone-id',
        writable: true,
      });
      Object.defineProperty(service, 'accessToken', {
        value: 'test-token',
        writable: true,
      });
    });

    it('should successfully send a template with body components and return messageId', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.template123' }],
            }),
        }) as typeof fetch;

      const result = await service.sendTemplate({
        to: '919876543210',
        templateName: 'appointment_reminder_24hr',
        languageCode: 'en',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Rahul Sharma' },
              { type: 'text', text: 'Tomorrow 10:00 AM' },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.template123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test-phone-id'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"template"'),
        }),
      );
    });

    it('should send template with header, body, and button components', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.template456' }],
            }),
        }) as typeof fetch;

      const result = await service.sendTemplate({
        to: '919876543210',
        templateName: 'invoice_payment',
        languageCode: 'en',
        components: [
          {
            type: 'header',
            parameters: [{ type: 'text', text: 'Invoice' }],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Meera Nair' },
              { type: 'text', text: '1500' },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [{ type: 'text', text: 'pay-token' }],
          },
        ],
      });

      expect(result.success).toBe(true);
      const fetchCall = (global.fetch as ReturnType<typeof jest.fn>).mock
        .calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as {
        template: { components: unknown[] };
      };
      expect(body.template.components).toHaveLength(3);
    });

    it('should return success false when credentials are not configured', async () => {
      global.fetch = jest.fn() as typeof fetch;
      Object.defineProperty(service, 'phoneNumberId', {
        value: '',
        writable: true,
      });

      const result = await service.sendTemplate({
        to: '919876543210',
        templateName: 'appointment_reminder_24hr',
      });

      expect(result.success).toBe(false);
      expect(result.messageId).toBe('skipped-no-config');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException on API error', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              error: { message: 'Template not found', code: 132001 },
            }),
        }) as typeof fetch;

      await expect(
        service.sendTemplate({
          to: '919876543210',
          templateName: 'nonexistent_template',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException on network error', async () => {
      global.fetch = jest.fn().mockImplementation(async () => {
        throw new Error('Network timeout');
      }) as typeof fetch;

      await expect(
        service.sendTemplate({
          to: '919876543210',
          templateName: 'appointment_reminder_24hr',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should normalize phone number by stripping plus prefix', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.norm123' }],
            }),
        }) as typeof fetch;

      await service.sendTemplate({
        to: '+919876543210',
        templateName: 'appointment_reminder_24hr',
      });

      const fetchCall = (global.fetch as ReturnType<typeof jest.fn>).mock
        .calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as { to: string };
      expect(body.to).toBe('919876543210');
    });

    it('should send template without components when components is undefined', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.nocomp123' }],
            }),
        }) as typeof fetch;

      await service.sendTemplate({
        to: '919876543210',
        templateName: 'appointment_reminder_24hr',
      });

      const fetchCall = (global.fetch as ReturnType<typeof jest.fn>).mock
        .calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as {
        template: { components?: unknown };
      };
      expect(body.template.components).toBeUndefined();
    });
  });

  describe('sendInteractiveButtons', () => {
    beforeEach(() => {
      Object.defineProperty(service, 'phoneNumberId', {
        value: 'test-phone-id',
        writable: true,
      });
      Object.defineProperty(service, 'accessToken', {
        value: 'test-token',
        writable: true,
      });
    });

    it('should successfully send interactive message with buttons', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.interactive123' }],
            }),
        }) as typeof fetch;

      const result = await service.sendInteractiveButtons({
        to: '919876543210',
        bodyText: 'Confirm your appointment?',
        buttons: [
          { id: 'btn_confirm', title: 'Confirm' },
          { id: 'btn_cancel', title: 'Cancel' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.interactive123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test-phone-id'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"interactive"'),
        }),
      );
    });

    it('should limit buttons to max 3', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.maxbtn' }],
            }),
        }) as typeof fetch;

      await service.sendInteractiveButtons({
        to: '919876543210',
        bodyText: 'Choose an option',
        buttons: [
          { id: 'btn1', title: 'Option 1' },
          { id: 'btn2', title: 'Option 2' },
          { id: 'btn3', title: 'Option 3' },
          { id: 'btn4', title: 'Option 4' },
        ],
      });

      const fetchCall = (global.fetch as ReturnType<typeof jest.fn>).mock
        .calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as {
        interactive: { action: { buttons: unknown[] } };
      };
      expect(body.interactive.action.buttons).toHaveLength(3);
    });

    it('should truncate button titles to 20 characters', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.truncbtn' }],
            }),
        }) as typeof fetch;

      await service.sendInteractiveButtons({
        to: '919876543210',
        bodyText: 'Choose',
        buttons: [
          {
            id: 'btn1',
            title: 'This is a very long button title that exceeds 20 chars',
          },
        ],
      });

      const fetchCall = (global.fetch as ReturnType<typeof jest.fn>).mock
        .calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as {
        interactive: {
          action: { buttons: Array<{ reply: { title: string } }> };
        };
      };
      expect(body.interactive.action.buttons[0].reply.title).toHaveLength(20);
    });

    it('should include header and footer when provided', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.headfoot' }],
            }),
        }) as typeof fetch;

      await service.sendInteractiveButtons({
        to: '919876543210',
        bodyText: 'Confirm your appointment?',
        buttons: [{ id: 'btn_confirm', title: 'Confirm' }],
        headerText: 'Appointment Reminder',
        footerText: 'Reply to confirm',
      });

      const fetchCall = (global.fetch as ReturnType<typeof jest.fn>).mock
        .calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as {
        interactive: { header?: unknown; footer?: unknown };
      };
      expect(body.interactive.header).toBeDefined();
      expect(body.interactive.footer).toBeDefined();
    });

    it('should omit header and footer when not provided', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: true,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              messages: [{ id: 'wamid.noheadfoot' }],
            }),
        }) as typeof fetch;

      await service.sendInteractiveButtons({
        to: '919876543210',
        bodyText: 'Confirm?',
        buttons: [{ id: 'btn_confirm', title: 'Confirm' }],
      });

      const fetchCall = (global.fetch as ReturnType<typeof jest.fn>).mock
        .calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as {
        interactive: { header?: unknown; footer?: unknown };
      };
      expect(body.interactive.header).toBeUndefined();
      expect(body.interactive.footer).toBeUndefined();
    });

    it('should return success false when credentials are not configured', async () => {
      Object.defineProperty(service, 'phoneNumberId', {
        value: '',
        writable: true,
      });

      const result = await service.sendInteractiveButtons({
        to: '919876543210',
        bodyText: 'Test',
        buttons: [{ id: 'btn', title: 'OK' }],
      });

      expect(result.success).toBe(false);
      expect(result.messageId).toBe('skipped-no-config');
    });

    it('should throw ServiceUnavailableException on API error', async () => {
      global.fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockResolvedValue({
              error: {
                message: 'Invalid interactive message format',
                code: 100,
              },
            }),
        }) as typeof fetch;

      await expect(
        service.sendInteractiveButtons({
          to: '919876543210',
          bodyText: 'Test',
          buttons: [{ id: 'btn', title: 'OK' }],
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
