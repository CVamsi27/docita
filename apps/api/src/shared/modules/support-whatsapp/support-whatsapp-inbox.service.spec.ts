import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { JsonValue } from '@workspace/types';
import { SupportWhatsAppInboxService } from './support-whatsapp-inbox.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from '@/shared/modules/messaging/whatsapp/whatsapp-client.service';
import type {
  SupportWhatsAppMessage,
  SupportWhatsAppMessageStatus,
} from '@workspace/types';

type SupportWhatsAppDirection = 'INBOUND' | 'OUTBOUND';
type SupportWhatsAppStatus = SupportWhatsAppMessageStatus;
interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text';
  text: { body: string };
}

interface WebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages: WebhookMessage[];
}

type SupportWhatsAppMessageRow = SupportWhatsAppMessage;
type SupportWhatsAppMessageLookup = Pick<
  SupportWhatsAppMessage,
  'providerMessageId' | 'supportPhoneNumber'
>;

function makeSupportWhatsAppMessageRow(
  overrides: Partial<SupportWhatsAppMessageRow> &
    Pick<
      SupportWhatsAppMessageRow,
      | 'id'
      | 'providerMessageId'
      | 'threadPhoneNumber'
      | 'supportPhoneNumber'
      | 'senderPhoneNumber'
      | 'direction'
      | 'messageType'
      | 'messageBody'
      | 'status'
      | 'receivedAt'
    >,
): SupportWhatsAppMessageRow {
  return {
    providerSentMessageId: null,
    senderName: null,
    respondedAt: null,
    replyToProviderMessageId: null,
    errorMessage: null,
    ...overrides,
  };
}

interface SupportWhatsAppMessageBaseData {
  threadPhoneNumber: string;
  supportPhoneNumber: string;
  senderPhoneNumber: string;
  senderName: string | null;
  direction: SupportWhatsAppDirection;
  messageType: string;
  messageBody: string;
  rawPayload?: JsonValue;
}

interface SupportWhatsAppMessageUpsertCreateData extends SupportWhatsAppMessageBaseData {
  providerMessageId: string;
  receivedAt: Date;
  status: SupportWhatsAppStatus;
}

type SupportWhatsAppMessageUpsertUpdateData = SupportWhatsAppMessageBaseData;

interface SupportWhatsAppMessageCreateData extends SupportWhatsAppMessageBaseData {
  providerMessageId: string;
  providerSentMessageId: string | null;
  receivedAt: Date;
  status: SupportWhatsAppStatus;
  replyToProviderMessageId?: string | null;
  errorMessage?: string | null;
  respondedAt?: Date | null;
}

interface SupportWhatsAppMessageUpsertArgs {
  where: { providerMessageId: string };
  update: SupportWhatsAppMessageUpsertUpdateData;
  create: SupportWhatsAppMessageUpsertCreateData;
}

interface SupportWhatsAppMessageCreateArgs {
  data: SupportWhatsAppMessageCreateData;
  select: Record<string, boolean>;
}

interface SupportWhatsAppMessageUpdateArgs {
  where: { providerMessageId: string };
  data: Partial<
    Pick<
      SupportWhatsAppMessageRow,
      'providerSentMessageId' | 'status' | 'respondedAt' | 'errorMessage'
    >
  > & {
    rawPayload?: JsonValue;
  };
  select?: Record<string, boolean>;
}

interface SupportWhatsAppMessageFindManyArgs {
  orderBy: Array<
    { receivedAt: 'asc' | 'desc' } | { createdAt: 'asc' | 'desc' }
  >;
  take: number;
  select: Record<string, boolean>;
  where?: {
    threadPhoneNumber?: string;
    direction?: SupportWhatsAppDirection;
    status?: SupportWhatsAppStatus | { in: SupportWhatsAppStatus[] };
    OR?: Array<
      { providerMessageId: string } | { providerSentMessageId: string }
    >;
  };
}

interface SupportWhatsAppMessageFindFirstArgs {
  where: {
    threadPhoneNumber?: string;
    direction?: SupportWhatsAppDirection;
  };
  orderBy: Array<
    { receivedAt: 'asc' | 'desc' } | { createdAt: 'asc' | 'desc' }
  >;
  select: {
    providerMessageId: boolean;
    supportPhoneNumber: boolean;
  };
}

type SupportWhatsAppMessageFindUniqueArgs = {
  where: { providerMessageId: string };
  select: { id: true };
};

interface SupportWhatsAppClientMock {
  sendMessage: jest.Mock<
    (args: { to: string; message: string }) => Promise<{
      success: boolean;
      messageId: string;
    }>
  >;
  AppSecret: string;
  VerifyToken: string;
}

describe('SupportWhatsAppInboxService', () => {
  let service: SupportWhatsAppInboxService;
  let loggerErrorSpy: jest.SpiedFunction<Logger['error']>;
  let loggerWarnSpy: jest.SpiedFunction<Logger['warn']>;

  const supportWhatsAppMessageUpsert =
    jest.fn<(args: SupportWhatsAppMessageUpsertArgs) => Promise<void>>();
  const supportWhatsAppMessageFindMany =
    jest.fn<
      (
        args: SupportWhatsAppMessageFindManyArgs,
      ) => Promise<SupportWhatsAppMessageRow[]>
    >();
  const supportWhatsAppMessageFindFirst =
    jest.fn<
      (
        args: SupportWhatsAppMessageFindFirstArgs,
      ) => Promise<SupportWhatsAppMessageLookup | null>
    >();
  const supportWhatsAppMessageFindUnique =
    jest.fn<
      (
        args: SupportWhatsAppMessageFindUniqueArgs,
      ) => Promise<{ id: string } | null>
    >();
  const supportWhatsAppMessageCreate =
    jest.fn<
      (
        args: SupportWhatsAppMessageCreateArgs,
      ) => Promise<SupportWhatsAppMessageRow>
    >();
  const supportWhatsAppMessageUpdate =
    jest.fn<
      (
        args: SupportWhatsAppMessageUpdateArgs,
      ) => Promise<SupportWhatsAppMessageRow>
    >();
  const supportWhatsAppMessageUpdateMany = jest.fn<
    (args: {
      where: {
        threadPhoneNumber?: string;
        direction?: SupportWhatsAppDirection;
        status?: SupportWhatsAppStatus | { in: SupportWhatsAppStatus[] };
        OR?: Array<
          { providerMessageId: string } | { providerSentMessageId: string }
        >;
      };
      data: {
        status: SupportWhatsAppStatus;
        respondedAt?: Date;
      };
    }) => Promise<{ count: number }>
  >();
  const mockWhatsappClient: SupportWhatsAppClientMock = {
    sendMessage: jest.fn<
      (args: { to: string; message: string }) => Promise<{
        success: boolean;
        messageId: string;
      }>
    >(),
    AppSecret: 'app-secret',
    VerifyToken: 'verify-token',
  };

  const mockPrisma = {
    supportWhatsAppMessage: {
      upsert: supportWhatsAppMessageUpsert,
      findUnique: supportWhatsAppMessageFindUnique,
      findMany: supportWhatsAppMessageFindMany,
      findFirst: supportWhatsAppMessageFindFirst,
      create: supportWhatsAppMessageCreate,
      update: supportWhatsAppMessageUpdate,
      updateMany: supportWhatsAppMessageUpdateMany,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    supportWhatsAppMessageUpsert.mockResolvedValue(undefined);
    supportWhatsAppMessageFindUnique.mockResolvedValue(null);
    supportWhatsAppMessageFindMany.mockResolvedValue([]);
    supportWhatsAppMessageFindFirst.mockResolvedValue(null);
    supportWhatsAppMessageCreate.mockImplementation(
      async (args: SupportWhatsAppMessageCreateArgs) =>
        makeSupportWhatsAppMessageRow({
          id: 'msg-created',
          providerMessageId: args.data.providerMessageId,
          providerSentMessageId: args.data.providerSentMessageId ?? null,
          threadPhoneNumber: args.data.threadPhoneNumber,
          supportPhoneNumber: args.data.supportPhoneNumber,
          senderPhoneNumber: args.data.senderPhoneNumber,
          senderName: args.data.senderName,
          direction: args.data.direction,
          messageType: args.data.messageType,
          messageBody: args.data.messageBody,
          status: args.data.status,
          receivedAt: args.data.receivedAt,
          respondedAt: args.data.respondedAt ?? null,
          replyToProviderMessageId: args.data.replyToProviderMessageId ?? null,
          errorMessage: args.data.errorMessage ?? null,
        }),
    );
    supportWhatsAppMessageUpdate.mockImplementation(
      async (args: SupportWhatsAppMessageUpdateArgs) =>
        makeSupportWhatsAppMessageRow({
          id: 'msg-updated',
          providerMessageId: 'draft-001',
          providerSentMessageId: args.data.providerSentMessageId ?? null,
          threadPhoneNumber: '919876543210',
          supportPhoneNumber: '918790311010',
          senderPhoneNumber: '918790311010',
          senderName: null,
          direction: 'OUTBOUND',
          messageType: 'text',
          messageBody: 'We are looking into this now.',
          status: args.data.status ?? 'SENT',
          receivedAt: new Date('2026-04-12T12:31:00Z'),
          respondedAt: args.data.respondedAt ?? null,
          replyToProviderMessageId: 'wamid.inbound-001',
          errorMessage: args.data.errorMessage ?? null,
        }),
    );
    supportWhatsAppMessageUpdateMany.mockResolvedValue({ count: 0 });
    mockWhatsappClient.sendMessage.mockResolvedValue({
      success: true,
      messageId: 'wamid.reply-001',
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SupportWhatsAppInboxService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
      ],
    }).compile();

    service = moduleRef.get(SupportWhatsAppInboxService);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('persists inbound webhook messages with thread metadata', async () => {
    const inboundMessage: WebhookMessage = {
      from: '919876543210',
      id: 'wamid.inbound-001',
      timestamp: '1712923200',
      type: 'text',
      text: { body: 'Just checking' },
    };

    const rawPayload: WebhookValue = {
      messaging_product: 'whatsapp',
      metadata: {
        display_phone_number: '918790311010',
        phone_number_id: 'phone-number-id',
      },
      contacts: [
        {
          profile: { name: 'Rahul Sharma' },
          wa_id: '919876543210',
        },
      ],
      messages: [inboundMessage],
    };
    const storedRawPayload = {
      metadata: rawPayload.metadata,
      contacts: rawPayload.contacts,
      message: inboundMessage,
    };

    await service.recordIncomingMessages(rawPayload);

    const upsertCall = supportWhatsAppMessageUpsert.mock.calls[0]?.[0];
    expect(upsertCall).toBeDefined();
    expect(upsertCall?.where).toEqual({
      providerMessageId: 'wamid.inbound-001',
    });
    expect(upsertCall?.update).toMatchObject({
      threadPhoneNumber: '919876543210',
      supportPhoneNumber: '918790311010',
      senderPhoneNumber: '919876543210',
      senderName: 'Rahul Sharma',
      direction: 'INBOUND',
      messageType: 'text',
      messageBody: 'Just checking',
      rawPayload: storedRawPayload,
    });
    expect(upsertCall?.create).toMatchObject({
      providerMessageId: 'wamid.inbound-001',
      threadPhoneNumber: '919876543210',
      supportPhoneNumber: '918790311010',
      senderPhoneNumber: '919876543210',
      senderName: 'Rahul Sharma',
      direction: 'INBOUND',
      messageType: 'text',
      messageBody: 'Just checking',
      status: 'NEW',
      rawPayload: storedRawPayload,
    });
    expect(upsertCall?.create.receivedAt).toBeInstanceOf(Date);
  });

  it('auto-replies to simple greetings with a support fallback', async () => {
    const inboundMessage: WebhookMessage = {
      from: '919876543210',
      id: 'wamid.inbound-002',
      timestamp: '1712923201',
      type: 'text',
      text: { body: 'Hi' },
    };

    supportWhatsAppMessageFindFirst.mockImplementation(
      async (args: SupportWhatsAppMessageFindFirstArgs) => {
        if (args.where.direction === 'OUTBOUND') {
          return null;
        }
        return {
          providerMessageId: inboundMessage.id,
          supportPhoneNumber: '918790311010',
        };
      },
    );

    const rawPayload: WebhookValue = {
      messaging_product: 'whatsapp',
      metadata: {
        display_phone_number: '918790311010',
        phone_number_id: 'phone-number-id',
      },
      contacts: [
        {
          profile: { name: 'Rahul Sharma' },
          wa_id: '919876543210',
        },
      ],
      messages: [inboundMessage],
    };

    await service.recordIncomingMessages(rawPayload);

    expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '919876543210',
        message: expect.stringContaining('support@docita.work'),
      }),
    );
  });

  it('lists thread summaries newest first and clamps the requested limit', async () => {
    supportWhatsAppMessageFindMany.mockResolvedValue([
      {
        id: 'msg-2',
        providerMessageId: 'wamid.2',
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '918790311010',
        senderName: null,
        direction: 'OUTBOUND',
        messageType: 'text',
        messageBody: 'We will help shortly',
        status: 'SENT',
        receivedAt: new Date('2026-04-12T12:30:00Z'),
        respondedAt: null,
        replyToProviderMessageId: 'wamid.1',
        errorMessage: null,
      },
      {
        id: 'msg-1',
        providerMessageId: 'wamid.1',
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '919876543210',
        senderName: 'Rahul Sharma',
        direction: 'INBOUND',
        messageType: 'text',
        messageBody: 'Need help',
        status: 'NEW',
        receivedAt: new Date('2026-04-12T12:00:00Z'),
        respondedAt: null,
        replyToProviderMessageId: null,
        errorMessage: null,
      },
    ]);

    const threads = await service.listThreads(250);

    expect(supportWhatsAppMessageFindMany).toHaveBeenCalledWith({
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
      select: {
        id: true,
        providerMessageId: true,
        providerSentMessageId: true,
        threadPhoneNumber: true,
        supportPhoneNumber: true,
        senderPhoneNumber: true,
        senderName: true,
        direction: true,
        messageType: true,
        messageBody: true,
        status: true,
        receivedAt: true,
        respondedAt: true,
        replyToProviderMessageId: true,
        errorMessage: true,
      },
    });
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      threadPhoneNumber: '919876543210',
      supportPhoneNumber: '918790311010',
      senderName: 'Rahul Sharma',
      lastMessageId: 'msg-2',
      lastMessageBody: 'We will help shortly',
      lastMessageDirection: 'OUTBOUND',
      lastMessageStatus: 'SENT',
      messageCount: 2,
      unreadCount: 1,
    });
  });

  it('fetches the newest thread messages and returns them oldest first', async () => {
    supportWhatsAppMessageFindMany.mockResolvedValue([
      {
        id: 'msg-1',
        providerMessageId: 'wamid.1',
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '918790311010',
        senderName: null,
        direction: 'OUTBOUND',
        messageType: 'text',
        messageBody: 'We will help shortly',
        status: 'SENT',
        receivedAt: new Date('2026-04-12T12:30:00Z'),
        respondedAt: null,
        replyToProviderMessageId: 'wamid.1',
        errorMessage: null,
      },
      {
        id: 'msg-2',
        providerMessageId: 'wamid.2',
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '919876543210',
        senderName: 'Rahul Sharma',
        direction: 'INBOUND',
        messageType: 'text',
        messageBody: 'Need help',
        status: 'READ',
        receivedAt: new Date('2026-04-12T12:00:00Z'),
        respondedAt: null,
        replyToProviderMessageId: null,
        errorMessage: null,
      },
    ]);

    const messages = await service.listThreadMessages('919876543210', 500);

    expect(supportWhatsAppMessageFindMany).toHaveBeenCalledWith({
      where: { threadPhoneNumber: '919876543210' },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      select: {
        id: true,
        providerMessageId: true,
        providerSentMessageId: true,
        threadPhoneNumber: true,
        supportPhoneNumber: true,
        senderPhoneNumber: true,
        senderName: true,
        direction: true,
        messageType: true,
        messageBody: true,
        status: true,
        receivedAt: true,
        respondedAt: true,
        replyToProviderMessageId: true,
        errorMessage: true,
      },
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe('msg-2');
    expect(messages[1].id).toBe('msg-1');
  });

  it('marks unread inbound thread messages as read', async () => {
    supportWhatsAppMessageUpdateMany.mockResolvedValue({ count: 2 });

    const updatedCount = await service.markThreadAsRead('919876543210');

    expect(supportWhatsAppMessageUpdateMany).toHaveBeenCalledWith({
      where: {
        threadPhoneNumber: '919876543210',
        direction: 'INBOUND',
        status: 'NEW',
      },
      data: {
        status: 'READ',
      },
    });
    expect(updatedCount).toBe(2);
  });

  it('sends a reply and persists the outbound WhatsApp row', async () => {
    supportWhatsAppMessageFindFirst.mockResolvedValue({
      providerMessageId: 'wamid.inbound-001',
      supportPhoneNumber: '918790311010',
    });

    const reply = await service.replyToThread(
      '919876543210',
      'We are looking into this now.',
    );

    expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith({
      to: '919876543210',
      message: 'We are looking into this now.',
    });
    expect(supportWhatsAppMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerMessageId: expect.stringMatching(/^draft-/),
        providerSentMessageId: null,
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '918790311010',
        direction: 'OUTBOUND',
        messageType: 'text',
        messageBody: 'We are looking into this now.',
        status: 'PENDING',
        replyToProviderMessageId: 'wamid.inbound-001',
      }),
      select: expect.any(Object),
    });
    expect(supportWhatsAppMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          providerMessageId: expect.stringMatching(/^draft-/),
        },
        data: expect.objectContaining({
          providerSentMessageId: 'wamid.reply-001',
          status: 'SENT',
          respondedAt: expect.any(Date),
          errorMessage: null,
        }),
        select: expect.any(Object),
      }),
    );
    expect(supportWhatsAppMessageUpdateMany).toHaveBeenCalledWith({
      where: {
        threadPhoneNumber: '919876543210',
        direction: 'INBOUND',
        status: { in: ['NEW', 'READ'] },
      },
      data: {
        status: 'REPLIED',
        respondedAt: expect.any(Date),
      },
    });
    expect(reply).toMatchObject({
      providerMessageId: expect.stringMatching(/^draft-/),
      providerSentMessageId: 'wamid.reply-001',
      direction: 'OUTBOUND',
      status: 'SENT',
    });
  });

  it('stores a failed reply attempt when WhatsApp sending fails', async () => {
    supportWhatsAppMessageFindFirst.mockResolvedValue({
      providerMessageId: 'wamid.inbound-001',
      supportPhoneNumber: '918790311010',
    });
    mockWhatsappClient.sendMessage.mockRejectedValue(
      new Error('WhatsApp unavailable'),
    );

    await expect(
      service.replyToThread('919876543210', 'Test reply'),
    ).rejects.toThrow(
      'Unable to send WhatsApp reply right now. Please try again.',
    );

    expect(supportWhatsAppMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerMessageId: expect.stringMatching(/^draft-/),
        providerSentMessageId: null,
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '918790311010',
        direction: 'OUTBOUND',
        messageType: 'text',
        messageBody: 'Test reply',
        status: 'PENDING',
        replyToProviderMessageId: 'wamid.inbound-001',
      }),
      select: expect.any(Object),
    });
    expect(supportWhatsAppMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          providerMessageId: expect.stringMatching(/^draft-/),
        },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'WhatsApp unavailable',
        }),
      }),
    );
  });

  it('updates outbound message statuses from provider webhooks', async () => {
    await service.updateMessageStatus('wamid.reply-001', 'delivered');

    expect(supportWhatsAppMessageUpdateMany).toHaveBeenCalledWith({
      where: {
        direction: 'OUTBOUND',
        OR: [
          { providerMessageId: 'wamid.reply-001' },
          { providerSentMessageId: 'wamid.reply-001' },
        ],
      },
      data: {
        status: 'DELIVERED',
      },
    });
  });
});
