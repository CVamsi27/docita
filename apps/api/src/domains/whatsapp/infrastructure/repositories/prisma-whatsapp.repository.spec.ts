import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  PrismaWhatsAppRepository,
  type PrismaWhatsAppMessageRecord,
  type PrismaWhatsAppReadClient,
  type PrismaWhatsAppTemplateRecord,
  type PrismaWhatsAppDatabase,
} from './prisma-whatsapp.repository';
import { PrismaWhatsAppMessageRepository } from './prisma-whatsapp-message.repository';
import { PrismaWhatsAppTemplateRepository } from './prisma-whatsapp-template.repository';
import {
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '../../core/entities/whatsapp-message.entity';
import {
  WhatsAppTemplate,
  WhatsAppTemplateStatus,
  WhatsAppTemplateCategory,
} from '../../core/entities/whatsapp-template.entity';
import {
  Prisma,
  WhatsappButtonType as PrismaButtonType,
  WhatsappMessageStatus as PrismaMessageStatus,
  WhatsappTemplateCategory as PrismaTemplateCategory,
  WhatsappTemplateStatus as PrismaTemplateStatus,
} from '@workspace/db';
import type { SupportWhatsAppMessage } from '@workspace/types';
import { createFixedClockMock } from '@/test-utils';

const NOW = new Date('2026-01-01T00:00:00.000Z');

type SupportWhatsAppMessageLookup = Pick<
  SupportWhatsAppMessage,
  'providerMessageId' | 'supportPhoneNumber'
>;

function makePrismaMessage(
  overrides: Partial<PrismaWhatsAppMessageRecord> = {},
): PrismaWhatsAppMessageRecord {
  return {
    id: 'msg-db-001',
    conversationId: 'conv-001',
    content: 'Hello patient',
    status: PrismaMessageStatus.SENT,
    providerMsgId: 'wamid.ext001',
    direction: 'OUTBOUND',
    messageType: 'TEXT',
    createdAt: NOW,
    conversation: {
      clinicId: 'clinic-123',
      patientId: 'patient-001',
    },
    ...overrides,
  };
}

function makePrismaTemplate(
  overrides: Partial<PrismaWhatsAppTemplateRecord> = {},
): PrismaWhatsAppTemplateRecord {
  return {
    id: 'tmpl-db-001',
    clinicId: 'clinic-123',
    name: 'appointment_reminder',
    category: PrismaTemplateCategory.STAFF_NOTIFICATION,
    content: 'Hello {{patientName}}',
    status: PrismaTemplateStatus.APPROVED,
    buttonType: PrismaButtonType.NONE,
    buttons: null,
    variables: null,
    metaTemplateId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('PrismaWhatsAppRepository', () => {
  let repository: PrismaWhatsAppRepository;
  let mockPrisma: jest.Mocked<PrismaWhatsAppDatabase>;
  let mockReadClient: jest.Mocked<PrismaWhatsAppReadClient>;

  beforeEach(() => {
    mockReadClient = {
      whatsappMessage: {
        findUnique: jest
          .fn<
            (args: {
              where: { id: string };
              include: { conversation: true };
            }) => Promise<PrismaWhatsAppMessageRecord | null>
          >()
          .mockResolvedValue(makePrismaMessage()),
        findFirst: jest
          .fn<
            (args: {
              where: { providerMsgId: string };
              include: { conversation: true };
            }) => Promise<PrismaWhatsAppMessageRecord | null>
          >()
          .mockResolvedValue(makePrismaMessage()),
      },
      patient: {
        findUnique: jest
          .fn<
            (args: {
              where: { id: string };
              select: { phoneNumber: true };
            }) => Promise<{ phoneNumber: string } | null>
          >()
          .mockResolvedValue({
            phoneNumber: '919876543210',
          }),
      },
      whatsappTemplate: {
        findUnique: jest
          .fn<
            (args: {
              where: { id: string };
            }) => Promise<PrismaWhatsAppTemplateRecord | null>
          >()
          .mockResolvedValue(makePrismaTemplate()),
        findFirst: jest
          .fn<
            (args: {
              where: { clinicId: string; name: string };
            }) => Promise<PrismaWhatsAppTemplateRecord | null>
          >()
          .mockResolvedValue(makePrismaTemplate()),
        findMany: jest
          .fn<
            (args: {
              where: { clinicId: string };
            }) => Promise<PrismaWhatsAppTemplateRecord[]>
          >()
          .mockResolvedValue([makePrismaTemplate()]),
      },
      clinic: {
        findUnique: jest
          .fn<
            (args: {
              where: { id: string };
              select: { whatsappAutomation: true };
            }) => Promise<{
              whatsappAutomation: { enabled?: boolean } | null;
            } | null>
          >()
          .mockResolvedValue({
            whatsappAutomation: { enabled: true },
          }),
      },
    };

    mockPrisma = {
      getReadClient: jest
        .fn<() => PrismaWhatsAppReadClient>()
        .mockReturnValue(mockReadClient),
      patient: {
        findFirst: jest
          .fn<
            (args: {
              where: { clinicId: string; phoneNumber: string; deletedAt: null };
              select: { id: true };
            }) => Promise<{ id: string } | null>
          >()
          .mockResolvedValue({ id: 'patient-001' }),
      },
      whatsappConversation: {
        upsert: jest
          .fn<
            (args: {
              where: {
                clinicId_contactPhone: {
                  clinicId: string;
                  contactPhone: string;
                };
              };
              create: {
                clinicId: string;
                patientId: string | null;
                contactPhone: string;
                lastMessageAt: Date;
              };
              update: { patientId: string | undefined; lastMessageAt: Date };
              select: { id: true };
            }) => Promise<{ id: string }>
          >()
          .mockResolvedValue({ id: 'conv-001' }),
      },
      whatsappMessage: {
        upsert: jest
          .fn<
            (args: {
              where: { id: string };
              update: {
                status: PrismaMessageStatus;
                providerMsgId: string | undefined;
              };
              create: {
                id: string;
                conversationId: string;
                content: string;
                status: PrismaMessageStatus;
                providerMsgId: string | undefined;
                direction: 'OUTBOUND';
                messageType: 'TEXT' | 'TEMPLATE';
              };
            }) => Promise<PrismaWhatsAppMessageRecord>
          >()
          .mockResolvedValue(makePrismaMessage()),
      },
      whatsappTemplate: {
        upsert: jest
          .fn<
            (args: {
              where: { id: string };
              update: {
                status: PrismaTemplateStatus;
                content: string;
                variables:
                  | Prisma.InputJsonValue
                  | Prisma.NullableJsonNullValueInput;
                buttons:
                  | Prisma.InputJsonValue
                  | Prisma.NullableJsonNullValueInput;
                buttonType: PrismaButtonType;
                category: PrismaTemplateCategory;
                metaTemplateId: string | null;
                updatedAt: Date;
              };
              create: {
                id: string;
                clinicId: string;
                name: string;
                category: PrismaTemplateCategory;
                content: string;
                status: PrismaTemplateStatus;
                variables:
                  | Prisma.InputJsonValue
                  | Prisma.NullableJsonNullValueInput;
                buttons:
                  | Prisma.InputJsonValue
                  | Prisma.NullableJsonNullValueInput;
                buttonType: PrismaButtonType;
                metaTemplateId: string | null;
                createdAt: Date;
                updatedAt: Date;
              };
            }) => Promise<PrismaWhatsAppTemplateRecord>
          >()
          .mockResolvedValue(makePrismaTemplate()),
      },
    };

    repository = new PrismaWhatsAppRepository(
      new PrismaWhatsAppMessageRepository(
        mockPrisma,
        createFixedClockMock(NOW.toISOString()),
      ),
      new PrismaWhatsAppTemplateRepository(mockPrisma),
    );
  });

  describe('ensureConversation', () => {
    it('should normalize the phone number and use the injected clock', async () => {
      await repository.ensureConversation('clinic-123', '+91 98765 43210');

      expect(mockPrisma.whatsappConversation.upsert).toHaveBeenCalledWith({
        where: {
          clinicId_contactPhone: {
            clinicId: 'clinic-123',
            contactPhone: '919876543210',
          },
        },
        create: {
          clinicId: 'clinic-123',
          patientId: 'patient-001',
          contactPhone: '919876543210',
          lastMessageAt: NOW,
        },
        update: {
          patientId: 'patient-001',
          lastMessageAt: NOW,
        },
        select: { id: true },
      });
    });
  });

  describe('saveMessage', () => {
    it('should upsert message with correct status mapping (DISPATCHED → QUEUED)', async () => {
      const message = new WhatsAppMessage({
        id: 'msg-001',
        clinicId: 'clinic-123',
        conversationId: 'conv-001',
        recipientPhone: '919876543210',
        content: 'Hello',
        status: WhatsAppMessageStatus.DISPATCHED,
        sentAt: NOW,
      });

      await repository.saveMessage(message);

      expect(mockPrisma.whatsappMessage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'msg-001' },
          create: expect.objectContaining({ status: 'QUEUED' }),
        }),
      );
    });

    it('should upsert message with SENT status', async () => {
      const message = new WhatsAppMessage({
        id: 'msg-002',
        clinicId: 'clinic-123',
        conversationId: 'conv-001',
        recipientPhone: '919876543210',
        content: 'Test',
        status: WhatsAppMessageStatus.SENT,
        sentAt: NOW,
      });

      await repository.saveMessage(message);

      expect(mockPrisma.whatsappMessage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: 'SENT' }),
        }),
      );
    });
  });

  describe('findMessageByExternalId', () => {
    it('should return a domain message when found', async () => {
      const message = await repository.findMessageByExternalId('wamid.ext001');

      expect(mockReadClient.whatsappMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerMsgId: 'wamid.ext001' } }),
      );
      expect(message).toBeInstanceOf(WhatsAppMessage);
      expect(message?.status).toBe(WhatsAppMessageStatus.SENT);
    });

    it('should return null when not found', async () => {
      mockReadClient.whatsappMessage.findFirst.mockResolvedValue(null);

      const message = await repository.findMessageByExternalId('wamid.nonexistent');
      expect(message).toBeNull();
    });

    it('should handle missing patient phone gracefully', async () => {
      mockReadClient.patient.findUnique.mockResolvedValue(null);

      const message = await repository.findMessageByExternalId('wamid.ext001');
      expect(message).not.toBeNull();
    });
  });

  describe('findMessageById', () => {
    it('should return domain message when found', async () => {
      const message = await repository.findMessageById('msg-db-001');

      expect(mockReadClient.whatsappMessage.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'msg-db-001' } }),
      );
      expect(message).toBeInstanceOf(WhatsAppMessage);
    });

    it('should return null when not found', async () => {
      mockReadClient.whatsappMessage.findUnique.mockResolvedValue(null);

      const message = await repository.findMessageById('nonexistent');
      expect(message).toBeNull();
    });
  });

  describe('template operations', () => {
    it('should save a template via upsert', async () => {
      const template = new WhatsAppTemplate({
        id: 'tmpl-001',
        clinicId: 'clinic-123',
        name: 'appointment_reminder',
        category: WhatsAppTemplateCategory.UTILITY,
        content: 'Hello {{patientName}}',
        status: WhatsAppTemplateStatus.APPROVED,
        buttons: [],
        createdAt: NOW,
        updatedAt: NOW,
      });

      await repository.saveTemplate(template);

      expect(mockPrisma.whatsappTemplate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tmpl-001' },
          create: expect.objectContaining({ name: 'appointment_reminder' }),
        }),
      );
    });

    it('should find template by id and return domain entity', async () => {
      const template = await repository.findTemplateById('tmpl-db-001');

      expect(template).toBeInstanceOf(WhatsAppTemplate);
      expect(template?.name).toBe('appointment_reminder');
      expect(template?.status).toBe(WhatsAppTemplateStatus.APPROVED);
    });

    it('should return null for unknown template id', async () => {
      mockReadClient.whatsappTemplate.findUnique.mockResolvedValue(null);

      const template = await repository.findTemplateById('nonexistent');
      expect(template).toBeNull();
    });

    it('should find template by clinic and name', async () => {
      const template = await repository.findTemplateByName(
        'clinic-123',
        'appointment_reminder',
      );

      expect(mockReadClient.whatsappTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-123', name: 'appointment_reminder' },
        }),
      );
      expect(template).toBeInstanceOf(WhatsAppTemplate);
    });

    it('should list templates for a clinic', async () => {
      const templates = await repository.listTemplatesByClinic('clinic-123');

      expect(mockReadClient.whatsappTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clinicId: 'clinic-123' } }),
      );
      expect(templates).toHaveLength(1);
      expect(templates[0]).toBeInstanceOf(WhatsAppTemplate);
    });

    it('should map PENDING_APPROVAL Prisma status to PENDING domain status', async () => {
      mockReadClient.whatsappTemplate.findUnique.mockResolvedValue(
        makePrismaTemplate({
          status: PrismaTemplateStatus.PENDING_APPROVAL,
        }),
      );

      const template = await repository.findTemplateById('tmpl-001');
      expect(template?.status).toBe(WhatsAppTemplateStatus.PENDING);
    });

    it('should map REJECTED Prisma status correctly', async () => {
      mockReadClient.whatsappTemplate.findUnique.mockResolvedValue(
        makePrismaTemplate({ status: PrismaTemplateStatus.REJECTED }),
      );

      const template = await repository.findTemplateById('tmpl-001');
      expect(template?.status).toBe(WhatsAppTemplateStatus.REJECTED);
    });
  });

  describe('isAutomationEnabled', () => {
    it('should return true when whatsappAutomation.enabled is true', async () => {
      const enabled = await repository.isAutomationEnabled('clinic-123');
      expect(enabled).toBe(true);
    });

    it('should return false when whatsappAutomation.enabled is false', async () => {
      mockReadClient.clinic.findUnique.mockResolvedValue({
        whatsappAutomation: { enabled: false },
      });

      const enabled = await repository.isAutomationEnabled('clinic-123');
      expect(enabled).toBe(false);
    });

    it('should default to true when clinic not found', async () => {
      mockReadClient.clinic.findUnique.mockResolvedValue(null);

      const enabled = await repository.isAutomationEnabled('clinic-123');
      expect(enabled).toBe(true);
    });

    it('should default to true when whatsappAutomation is null', async () => {
      mockReadClient.clinic.findUnique.mockResolvedValue({
        whatsappAutomation: null,
      });

      const enabled = await repository.isAutomationEnabled('clinic-123');
      expect(enabled).toBe(true);
    });
  });
});
