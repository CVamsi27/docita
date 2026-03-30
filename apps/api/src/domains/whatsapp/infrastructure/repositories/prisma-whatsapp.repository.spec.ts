import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PrismaWhatsAppRepository } from './prisma-whatsapp.repository';
import {
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '../../core/entities/whatsapp-message.entity';
import {
  WhatsAppTemplate,
  WhatsAppTemplateStatus,
  WhatsAppTemplateCategory,
} from '../../core/entities/whatsapp-template.entity';

const NOW = new Date('2026-01-01T00:00:00.000Z');

function makePrismaMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-db-001',
    conversationId: 'conv-001',
    content: 'Hello patient',
    status: 'SENT',
    providerMsgId: 'wamid.ext001',
    direction: 'OUTBOUND',
    messageType: 'TEXT',
    createdAt: NOW,
    updatedAt: NOW,
    conversation: {
      id: 'conv-001',
      clinicId: 'clinic-123',
      patientId: 'patient-001',
    },
    ...overrides,
  };
}

function makePrismaTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tmpl-db-001',
    clinicId: 'clinic-123',
    name: 'appointment_reminder',
    category: 'UTILITY',
    content: 'Hello {{patientName}}',
    status: 'APPROVED',
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
  let mockPrisma: Record<string, Record<string, jest.MockedFunction<any>>>;

  beforeEach(() => {
    mockPrisma = {
      whatsappMessage: {
        upsert: jest.fn<() => Promise<any>>().mockResolvedValue({}),
        findUnique: jest
          .fn<() => Promise<any>>()
          .mockResolvedValue(makePrismaMessage()),
        findFirst: jest
          .fn<() => Promise<any>>()
          .mockResolvedValue(makePrismaMessage()),
      },
      whatsappTemplate: {
        upsert: jest.fn<() => Promise<any>>().mockResolvedValue({}),
        findUnique: jest
          .fn<() => Promise<any>>()
          .mockResolvedValue(makePrismaTemplate()),
        findFirst: jest
          .fn<() => Promise<any>>()
          .mockResolvedValue(makePrismaTemplate()),
        findMany: jest
          .fn<() => Promise<any[]>>()
          .mockResolvedValue([makePrismaTemplate()]),
      },
      patient: {
        findUnique: jest
          .fn<() => Promise<any>>()
          .mockResolvedValue({ phoneNumber: '919876543210' }),
      },
      clinic: {
        findUnique: jest.fn<() => Promise<any>>().mockResolvedValue({
          whatsappAutomation: { enabled: true },
        }),
      },
    };

    repository = new PrismaWhatsAppRepository(mockPrisma as any);
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

      expect(mockPrisma.whatsappMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerMsgId: 'wamid.ext001' } }),
      );
      expect(message).toBeInstanceOf(WhatsAppMessage);
      expect(message?.status).toBe(WhatsAppMessageStatus.SENT);
    });

    it('should return null when not found', async () => {
      mockPrisma.whatsappMessage.findFirst.mockResolvedValue(null);

      const message =
        await repository.findMessageByExternalId('wamid.nonexistent');
      expect(message).toBeNull();
    });

    it('should handle missing patient phone gracefully', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      const message = await repository.findMessageByExternalId('wamid.ext001');
      expect(message).not.toBeNull();
    });
  });

  describe('findMessageById', () => {
    it('should return domain message when found', async () => {
      const message = await repository.findMessageById('msg-db-001');

      expect(mockPrisma.whatsappMessage.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'msg-db-001' } }),
      );
      expect(message).toBeInstanceOf(WhatsAppMessage);
    });

    it('should return null when not found', async () => {
      mockPrisma.whatsappMessage.findUnique.mockResolvedValue(null);

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
        buttons: {},
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
      mockPrisma.whatsappTemplate.findUnique.mockResolvedValue(null);

      const template = await repository.findTemplateById('nonexistent');
      expect(template).toBeNull();
    });

    it('should find template by clinic and name', async () => {
      const template = await repository.findTemplateByName(
        'clinic-123',
        'appointment_reminder',
      );

      expect(mockPrisma.whatsappTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-123', name: 'appointment_reminder' },
        }),
      );
      expect(template).toBeInstanceOf(WhatsAppTemplate);
    });

    it('should list templates for a clinic', async () => {
      const templates = await repository.listTemplatesByClinic('clinic-123');

      expect(mockPrisma.whatsappTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clinicId: 'clinic-123' } }),
      );
      expect(templates).toHaveLength(1);
      expect(templates[0]).toBeInstanceOf(WhatsAppTemplate);
    });

    it('should map PENDING_APPROVAL Prisma status to PENDING domain status', async () => {
      mockPrisma.whatsappTemplate.findUnique.mockResolvedValue(
        makePrismaTemplate({ status: 'PENDING_APPROVAL' }),
      );

      const template = await repository.findTemplateById('tmpl-001');
      expect(template?.status).toBe(WhatsAppTemplateStatus.PENDING);
    });

    it('should map REJECTED Prisma status correctly', async () => {
      mockPrisma.whatsappTemplate.findUnique.mockResolvedValue(
        makePrismaTemplate({ status: 'REJECTED' }),
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
      mockPrisma.clinic.findUnique.mockResolvedValue({
        whatsappAutomation: { enabled: false },
      });

      const enabled = await repository.isAutomationEnabled('clinic-123');
      expect(enabled).toBe(false);
    });

    it('should default to true when clinic not found', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue(null);

      const enabled = await repository.isAutomationEnabled('clinic-123');
      expect(enabled).toBe(true);
    });

    it('should default to true when whatsappAutomation is null', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        whatsappAutomation: null,
      });

      const enabled = await repository.isAutomationEnabled('clinic-123');
      expect(enabled).toBe(true);
    });
  });
});
