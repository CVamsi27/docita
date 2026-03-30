import * as crypto from 'crypto';
import { jest } from '@jest/globals';

export const mockWhatsappClientService = {
  sendMessage: jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({ success: true, messageId: 'wamid.test123' }),
  sendTemplate: jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({ success: true, messageId: 'wamid.template123' }),
  sendInteractiveButtons: jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({ success: true, messageId: 'wamid.interactive123' }),
  AppSecret: 'test-app-secret',
  VerifyToken: 'test-verify-token',
};

export const mockTemplatesService = {
  resolveTemplate: jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({
      id: 'appointment_reminder_24hr',
      name: 'appointment_reminder_24hr',
      language: 'en_US',
      content: 'Your appointment is confirmed',
      buttons: [],
      components: [],
    }),
  getMessageForMode: jest.fn().mockReturnValue('Your appointment is confirmed'),
  getDefaultTemplateNames: jest
    .fn()
    .mockReturnValue([
      'appointment_reminder_24hr',
      'appointment_reminder_30min',
      'appointment_confirmation',
    ]),
};

export const mockPrismaForWhatsapp = {
  whatsappLog: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findMany: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([]),
    create: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ id: 'log-123' }),
    update: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ id: 'log-123' }),
    updateMany: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ count: 1 }),
    count: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(0),
  },
  patient: {
    findFirst: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
    findUnique: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
    findMany: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([]),
    count: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(10),
  },
  appointment: {
    findFirst: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
    findUnique: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
    update: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ id: 'appt-123' }),
  },
  appointmentResponse: {
    create: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ id: 'resp-123' }),
    update: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ id: 'resp-123' }),
  },
  clinic: {
    findUnique: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({
        id: 'clinic-123',
        name: 'Test Clinic',
        whatsappAutomation: { enabled: true },
      }),
  },
  staffNotification: {
    create: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ id: 'notif-123' }),
    findFirst: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
    findMany: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([]),
    updateMany: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ count: 1 }),
    count: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(0),
  },
  user: {
    findMany: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([]),
  },
  prescription: {
    findUnique: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
  },
  invoice: {
    findUnique: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
  },
};

export const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

type WebhookMessageType =
  | 'text'
  | 'interactive_button_reply'
  | 'interactive_list_reply'
  | 'button'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contacts';

export function createWebhookPayload(
  type: WebhookMessageType,
  options: {
    from?: string;
    messageId?: string;
    body?: string;
    buttonId?: string;
    buttonTitle?: string;
  } = {},
) {
  const from = options.from ?? '919876543210';
  const messageId = options.messageId ?? `wamid.msg_${Date.now()}`;

  let message: Record<string, unknown>;

  switch (type) {
    case 'text':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        text: { body: options.body ?? 'yes' },
      };
      break;
    case 'interactive_button_reply':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: options.buttonId ?? 'btn_confirm',
            title: options.buttonTitle ?? 'Confirm',
          },
        },
      };
      break;
    case 'interactive_list_reply':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: {
            id: options.buttonId ?? 'option_1',
            title: options.buttonTitle ?? 'Option 1',
          },
        },
      };
      break;
    case 'button':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'button',
        button: {
          payload: options.buttonId ?? 'btn_confirm',
          text: options.buttonTitle ?? 'Confirm',
        },
      };
      break;
    case 'image':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'image',
        image: { id: 'img-123', mime_type: 'image/jpeg' },
      };
      break;
    case 'audio':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'audio',
        audio: { id: 'audio-123', mime_type: 'audio/ogg' },
      };
      break;
    case 'video':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'video',
        video: { id: 'video-123', mime_type: 'video/mp4' },
      };
      break;
    case 'document':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'document',
        document: {
          id: 'doc-123',
          mime_type: 'application/pdf',
          filename: 'test.pdf',
        },
      };
      break;
    case 'location':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'location',
        location: { latitude: 12.9716, longitude: 77.5946 },
      };
      break;
    case 'contacts':
      message = {
        id: messageId,
        from,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'contacts',
        contacts: [{ name: { formatted_name: 'Test Contact' } }],
      };
      break;
    default:
      throw new Error(`Unknown message type: ${type as string}`);
  }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry-123',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'test-phone-id',
              },
              contacts: [
                {
                  profile: { name: 'Test Patient' },
                  wa_id: from,
                },
              ],
              messages: [message],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

type StatusType = 'sent' | 'delivered' | 'read' | 'failed';

export function createStatusPayload(
  status: StatusType,
  options: {
    messageId?: string;
    errorCode?: number;
    errorTitle?: string;
  } = {},
) {
  const messageId = options.messageId ?? `wamid.msg_${Date.now()}`;

  const statusObj: Record<string, unknown> = {
    id: messageId,
    status,
    timestamp: String(Math.floor(Date.now() / 1000)),
    recipient_id: '919876543210',
  };

  if (status === 'failed') {
    statusObj.errors = [
      {
        code: options.errorCode ?? 131030,
        title:
          options.errorTitle ?? 'Recipient phone number not in allowed list',
      },
    ];
  }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry-123',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'test-phone-id',
              },
              statuses: [statusObj],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

export function createValidSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}
