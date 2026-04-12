import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SupportWhatsAppInboxService } from './support-whatsapp-inbox.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from '@/shared/modules/messaging/whatsapp/whatsapp-client.service';

describe('SupportWhatsAppInboxService', () => {
  let service: SupportWhatsAppInboxService;

  const supportWhatsAppMessageUpsert = jest.fn();
  const supportWhatsAppMessageFindMany = jest.fn();
  const supportWhatsAppMessageFindFirst = jest.fn();
  const supportWhatsAppMessageCreate = jest.fn();
  const supportWhatsAppMessageUpdate = jest.fn();
  const supportWhatsAppMessageUpdateMany = jest.fn();
  const mockWhatsappClient = {
    sendMessage: jest.fn(),
    AppSecret: 'app-secret',
    VerifyToken: 'verify-token',
  };

  const mockPrisma = {
    supportWhatsAppMessage: {
      upsert: supportWhatsAppMessageUpsert,
      findMany: supportWhatsAppMessageFindMany,
      findFirst: supportWhatsAppMessageFindFirst,
      create: supportWhatsAppMessageCreate,
      update: supportWhatsAppMessageUpdate,
      updateMany: supportWhatsAppMessageUpdateMany,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    supportWhatsAppMessageUpsert.mockResolvedValue(undefined);
    supportWhatsAppMessageFindMany.mockResolvedValue([]);
    supportWhatsAppMessageFindFirst.mockResolvedValue(null);
    supportWhatsAppMessageCreate.mockImplementation(
      async (args: { data: Record<string, unknown> }) => ({
        id: 'msg-created',
        ...args.data,
      }),
    );
    supportWhatsAppMessageUpdate.mockImplementation(
      async (args: {
        where: { providerMessageId: string };
        data: Record<string, unknown>;
      }) => ({
        id: 'msg-updated',
        providerMessageId: args.where.providerMessageId,
        direction: 'OUTBOUND',
        ...args.data,
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

  it('persists inbound webhook messages with thread metadata', async () => {
    await service.recordIncomingMessages({
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
      messages: [
        {
          from: '919876543210',
          id: 'wamid.inbound-001',
          timestamp: '1712923200',
          type: 'text',
          text: { body: 'Need onboarding help' },
        },
      ],
    });

    expect(supportWhatsAppMessageUpsert).toHaveBeenCalledWith({
      where: { providerMessageId: 'wamid.inbound-001' },
      update: {
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '919876543210',
        senderName: 'Rahul Sharma',
        direction: 'INBOUND',
        messageType: 'text',
        messageBody: 'Need onboarding help',
        rawPayload: expect.any(Object),
      },
      create: {
        providerMessageId: 'wamid.inbound-001',
        threadPhoneNumber: '919876543210',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '919876543210',
        senderName: 'Rahul Sharma',
        direction: 'INBOUND',
        messageType: 'text',
        messageBody: 'Need onboarding help',
        receivedAt: expect.any(Date),
        status: 'NEW',
        rawPayload: expect.any(Object),
      },
    });
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

  it('returns thread messages ordered oldest first', async () => {
    supportWhatsAppMessageFindMany.mockResolvedValue([
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
        status: 'READ',
        receivedAt: new Date('2026-04-12T12:00:00Z'),
        respondedAt: null,
        replyToProviderMessageId: null,
        errorMessage: null,
      },
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
    ]);

    const messages = await service.listThreadMessages('919876543210', 500);

    expect(supportWhatsAppMessageFindMany).toHaveBeenCalledWith({
      where: { threadPhoneNumber: '919876543210' },
      orderBy: [{ receivedAt: 'asc' }, { createdAt: 'asc' }],
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
    expect(messages[0].id).toBe('msg-1');
    expect(messages[1].id).toBe('msg-2');
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
