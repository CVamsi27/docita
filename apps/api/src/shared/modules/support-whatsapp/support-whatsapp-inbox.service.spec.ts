import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SupportWhatsAppInboxService } from './support-whatsapp-inbox.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('SupportWhatsAppInboxService', () => {
  let service: SupportWhatsAppInboxService;

  const supportWhatsAppMessageUpsert = jest.fn();
  const supportWhatsAppMessageFindMany = jest.fn();

  const mockPrisma = {
    supportWhatsAppMessage: {
      upsert: supportWhatsAppMessageUpsert,
      findMany: supportWhatsAppMessageFindMany,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    supportWhatsAppMessageUpsert.mockResolvedValue(undefined);
    supportWhatsAppMessageFindMany.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SupportWhatsAppInboxService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = moduleRef.get(SupportWhatsAppInboxService);
  });

  it('persists inbound webhook messages with extracted text content', async () => {
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
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '919876543210',
        senderName: 'Rahul Sharma',
        messageType: 'text',
        messageBody: 'Need onboarding help',
        rawPayload: expect.any(Object),
      },
      create: {
        providerMessageId: 'wamid.inbound-001',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '919876543210',
        senderName: 'Rahul Sharma',
        messageType: 'text',
        messageBody: 'Need onboarding help',
        receivedAt: expect.any(Date),
        rawPayload: expect.any(Object),
      },
    });
  });

  it('lists messages newest first and clamps the requested limit', async () => {
    supportWhatsAppMessageFindMany.mockResolvedValue([
      {
        id: 'msg-1',
        providerMessageId: 'wamid.1',
        supportPhoneNumber: '918790311010',
        senderPhoneNumber: '919876543210',
        senderName: 'Rahul Sharma',
        messageType: 'text',
        messageBody: 'Need help',
        status: 'NEW',
        receivedAt: new Date('2026-04-12T12:00:00Z'),
        respondedAt: null,
      },
    ]);

    const messages = await service.listMessages(250);

    expect(supportWhatsAppMessageFindMany).toHaveBeenCalledWith({
      orderBy: { receivedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        providerMessageId: true,
        supportPhoneNumber: true,
        senderPhoneNumber: true,
        senderName: true,
        messageType: true,
        messageBody: true,
        status: true,
        receivedAt: true,
        respondedAt: true,
      },
    });
    expect(messages).toHaveLength(1);
  });
});
