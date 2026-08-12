import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { WhatsappResendService } from './resend.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { TemplatesFacadeService as TemplatesService } from '@/shared/whatsapp/templates-facade.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { ApprovalStatus, WhatsappLogStatus } from '@workspace/db';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('WhatsappResendService', () => {
  let service: WhatsappResendService;
  let mocks: ReturnType<typeof buildMocks>;
  const FIXED_NOW = new Date('2026-08-09T10:00:00.000Z');
  const OLD_DATE = new Date('2026-08-01T09:00:00.000Z');

  function defaultPrescription(overrides: Record<string, unknown> = {}) {
    return {
      id: 'rx-1',
      patient: {
        id: 'pat-1',
        firstName: 'Rahul',
        lastName: 'Sharma',
        phoneNumber: '919876543210',
      },
      doctor: { name: 'Dr. Patel' },
      medications: [],
      appointment: { clinic: { name: 'Test Clinic', currency: 'INR' } },
      whatsappSentAt: null,
      approvalStatus: ApprovalStatus.PENDING,
      approvedById: 'dr-original',
      approvedAt: OLD_DATE,
      ...overrides,
    };
  }

  function defaultInvoice(overrides: Record<string, unknown> = {}) {
    return {
      id: 'inv-1234-ABCDEFGH',
      total: 1500,
      currency: 'INR',
      createdAt: OLD_DATE,
      whatsappSentAt: null,
      approvalStatus: ApprovalStatus.PENDING,
      approvedById: 'dr-original',
      approvedAt: OLD_DATE,
      patient: {
        id: 'pat-2',
        firstName: 'Meera',
        lastName: 'Nair',
        phoneNumber: '919876543211',
      },
      appointment: { clinic: { name: 'Test Clinic', currency: 'INR' } },
      paymentSessions: [{ id: 'ps-1', status: 'CREATED', createdAt: OLD_DATE }],
      ...overrides,
    };
  }

  function buildMocks() {
    return {
      persistence: {
        prescription: {
          findUnique: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockImplementation(async () => defaultPrescription()),
          update: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockImplementation(async () => ({ id: 'rx-1' })),
        },
        invoice: {
          findUnique: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockImplementation(async () => defaultInvoice()),
          update: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockImplementation(async () => ({ id: 'inv-1234-ABCDEFGH' })),
        },
        whatsappLog: {
          create: jest
            .fn<(...args: unknown[]) => Promise<unknown>>()
            .mockImplementation(async () => ({ id: 'log-1' })),
        },
      },
      templatesService: {
        resolveTemplate: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({ name: 'prescription_created' })),
        getMessageForMode: jest
          .fn<(...args: unknown[]) => string>()
          .mockReturnValue('Preview text'),
      },
      sendMessage: {
        execute: jest.fn<SendMessageUseCase['execute']>().mockResolvedValue({
          messageId: 'msg-123',
          providerMessageId: 'prov-123',
        }),
      },
    };
  }

  beforeEach(async () => {
    mocks = buildMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappResendService,
        { provide: WHATSAPP_PERSISTENCE_PORT, useValue: mocks.persistence },
        { provide: TemplatesService, useValue: mocks.templatesService },
        { provide: SendMessageUseCase, useValue: mocks.sendMessage },
        { provide: CLOCK_PORT, useValue: { now: () => FIXED_NOW } },
      ],
    }).compile();
    service = module.get<WhatsappResendService>(WhatsappResendService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resendPrescription', () => {
    it('sends the prescription template and auto-approves for an authorized role', async () => {
      const result = await service.resendPrescription(
        'clinic-1',
        'user-1',
        'DOCTOR',
        'rx-1',
      );

      expect(mocks.persistence.prescription.findUnique).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
        include: expect.objectContaining({
          patient: {
            select: expect.objectContaining({
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            }),
          },
          doctor: { select: { name: true } },
          appointment: {
            include: { clinic: { select: { name: true, currency: true } } },
          },
        }),
      });
      expect(mocks.templatesService.resolveTemplate).toHaveBeenCalledWith(
        'prescription_created',
        expect.objectContaining({
          patientName: 'Rahul Sharma',
          clinicName: 'Test Clinic',
          doctorName: 'Dr. Patel',
          rxToken: 'rx-1',
        }),
        'clinic-1',
      );
      expect(mocks.templatesService.getMessageForMode).toHaveBeenCalledWith({
        name: 'prescription_created',
      });
      expect(mocks.sendMessage.execute).toHaveBeenCalledWith({
        clinicId: 'clinic-1',
        recipientPhone: '919876543210',
        templateName: 'prescription_created',
        variables: expect.objectContaining({ rxToken: 'rx-1' }),
      });
      expect(mocks.persistence.prescription.update).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
        data: {
          whatsappSentAt: FIXED_NOW,
          whatsappMessageId: 'prov-123',
          whatsappStatus: WhatsappLogStatus.SENT,
          approvalStatus: ApprovalStatus.AUTO_APPROVED,
          approvedById: 'user-1',
          approvedAt: FIXED_NOW,
          version: { increment: 1 },
        },
      });
      expect(mocks.persistence.whatsappLog.create).toHaveBeenCalledWith({
        data: {
          clinicId: 'clinic-1',
          patientId: 'pat-1',
          prescriptionId: 'rx-1',
          type: 'prescription',
          phoneNumber: '919876543210',
          message: 'Preview text',
          status: WhatsappLogStatus.SENT,
          providerMessageId: 'prov-123',
        },
      });
      expect(result).toEqual({ success: true, messageId: 'prov-123' });
    });

    it('falls back to the internal message id when the provider returns none', async () => {
      mocks.sendMessage.execute.mockResolvedValue({
        messageId: 'msg-123',
        providerMessageId: '',
      });

      const result = await service.resendPrescription(
        'clinic-1',
        'user-1',
        'DOCTOR',
        'rx-1',
      );

      expect(mocks.persistence.prescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ whatsappMessageId: 'msg-123' }),
        }),
      );
      expect(result).toEqual({ success: true, messageId: 'msg-123' });
    });

    it('throws NotFoundException when the prescription does not exist', async () => {
      mocks.persistence.prescription.findUnique.mockImplementation(
        async () => null,
      );

      await expect(
        service.resendPrescription('clinic-1', 'user-1', 'DOCTOR', 'rx-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mocks.persistence.prescription.update).not.toHaveBeenCalled();
      expect(mocks.persistence.whatsappLog.create).not.toHaveBeenCalled();
    });

    it('rejects when the patient has no phone number', async () => {
      mocks.persistence.prescription.findUnique.mockImplementation(async () =>
        defaultPrescription({ patient: { phoneNumber: null } }),
      );

      await expect(
        service.resendPrescription('clinic-1', 'user-1', 'DOCTOR', 'rx-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });

    it('rejects a resend inside the 30s debounce window with 429', async () => {
      mocks.persistence.prescription.findUnique.mockImplementation(async () =>
        defaultPrescription({
          whatsappSentAt: new Date(FIXED_NOW.getTime() - 5_000),
        }),
      );

      let caught: unknown;
      try {
        await service.resendPrescription(
          'clinic-1',
          'user-1',
          'DOCTOR',
          'rx-1',
        );
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(HttpException);
      expect((caught as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((caught as HttpException).message).toBe(
        'A resend for this record was just sent. Please wait before retrying.',
      );
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });

    it('rejects a resend of an unapproved prescription for a non-authorized role', async () => {
      await expect(
        service.resendPrescription('clinic-1', 'user-1', 'STAFF', 'rx-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });

    it('keeps the existing approval state for a non-authorized role resending an approved prescription', async () => {
      mocks.persistence.prescription.findUnique.mockImplementation(async () =>
        defaultPrescription({
          approvalStatus: ApprovalStatus.APPROVED,
          approvedById: 'dr-original',
          approvedAt: OLD_DATE,
        }),
      );

      const result = await service.resendPrescription(
        'clinic-1',
        'user-1',
        'STAFF',
        'rx-1',
      );

      expect(mocks.persistence.prescription.update).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
        data: {
          whatsappSentAt: FIXED_NOW,
          whatsappMessageId: 'prov-123',
          whatsappStatus: WhatsappLogStatus.SENT,
          approvalStatus: ApprovalStatus.APPROVED,
          approvedById: 'dr-original',
          approvedAt: OLD_DATE,
          version: { increment: 1 },
        },
      });
      expect(result).toEqual({ success: true, messageId: 'prov-123' });
    });

    it('rejects when the prescription template is not configured', async () => {
      mocks.templatesService.resolveTemplate.mockImplementation(
        async () => null,
      );

      await expect(
        service.resendPrescription('clinic-1', 'user-1', 'DOCTOR', 'rx-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });
  });

  describe('resendInvoice', () => {
    it('sends the invoice template with the latest payment session and no version bump', async () => {
      const result = await service.resendInvoice(
        'clinic-1',
        'user-1',
        'DOCTOR',
        'inv-1234-ABCDEFGH',
      );

      expect(mocks.persistence.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-1234-ABCDEFGH' },
        include: expect.objectContaining({
          patient: { select: expect.objectContaining({ phoneNumber: true }) },
          appointment: {
            include: { clinic: { select: { name: true, currency: true } } },
          },
          paymentSessions: expect.objectContaining({
            take: 1,
          }),
        }),
      });
      expect(mocks.templatesService.resolveTemplate).toHaveBeenCalledWith(
        'invoice_ready',
        expect.objectContaining({
          patientName: 'Meera Nair',
          clinicName: 'Test Clinic',
          invoiceNumber: 'ABCDEFGH',
          payToken: 'ps-1',
        }),
        'clinic-1',
      );
      expect(mocks.sendMessage.execute).toHaveBeenCalledWith({
        clinicId: 'clinic-1',
        recipientPhone: '919876543211',
        templateName: 'invoice_ready',
        variables: expect.objectContaining({ payToken: 'ps-1' }),
      });
      expect(mocks.persistence.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1234-ABCDEFGH' },
        data: {
          whatsappSentAt: FIXED_NOW,
          whatsappMessageId: 'prov-123',
          whatsappStatus: WhatsappLogStatus.SENT,
          approvalStatus: ApprovalStatus.AUTO_APPROVED,
          approvedById: 'user-1',
          approvedAt: FIXED_NOW,
        },
      });
      expect(mocks.persistence.whatsappLog.create).toHaveBeenCalledWith({
        data: {
          clinicId: 'clinic-1',
          patientId: 'pat-2',
          invoiceId: 'inv-1234-ABCDEFGH',
          type: 'invoice',
          phoneNumber: '919876543211',
          message: 'Preview text',
          status: WhatsappLogStatus.SENT,
          providerMessageId: 'prov-123',
        },
      });
      expect(result).toEqual({ success: true, messageId: 'prov-123' });
    });

    it('throws NotFoundException when the invoice does not exist', async () => {
      mocks.persistence.invoice.findUnique.mockImplementation(async () => null);

      await expect(
        service.resendInvoice('clinic-1', 'user-1', 'DOCTOR', 'inv-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mocks.persistence.invoice.update).not.toHaveBeenCalled();
      expect(mocks.persistence.whatsappLog.create).not.toHaveBeenCalled();
    });

    it('rejects when the patient has no phone number', async () => {
      mocks.persistence.invoice.findUnique.mockImplementation(async () =>
        defaultInvoice({ patient: { phoneNumber: null } }),
      );

      await expect(
        service.resendInvoice('clinic-1', 'user-1', 'DOCTOR', 'inv-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });

    it('rejects a resend inside the 30s debounce window with 429', async () => {
      mocks.persistence.invoice.findUnique.mockImplementation(async () =>
        defaultInvoice({
          whatsappSentAt: new Date(FIXED_NOW.getTime() - 5_000),
        }),
      );

      let caught: unknown;
      try {
        await service.resendInvoice('clinic-1', 'user-1', 'DOCTOR', 'inv-1');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(HttpException);
      expect((caught as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((caught as HttpException).message).toBe(
        'A resend for this record was just sent. Please wait before retrying.',
      );
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });

    it('rejects a resend of an unapproved invoice for a non-authorized role', async () => {
      await expect(
        service.resendInvoice('clinic-1', 'user-1', 'STAFF', 'inv-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });

    it('keeps the existing approval state for a non-authorized role resending an approved invoice', async () => {
      mocks.persistence.invoice.findUnique.mockImplementation(async () =>
        defaultInvoice({
          approvalStatus: ApprovalStatus.APPROVED,
          approvedById: 'dr-original',
          approvedAt: OLD_DATE,
        }),
      );

      const result = await service.resendInvoice(
        'clinic-1',
        'user-1',
        'STAFF',
        'inv-1234-ABCDEFGH',
      );

      expect(mocks.persistence.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1234-ABCDEFGH' },
        data: {
          whatsappSentAt: FIXED_NOW,
          whatsappMessageId: 'prov-123',
          whatsappStatus: WhatsappLogStatus.SENT,
          approvalStatus: ApprovalStatus.APPROVED,
          approvedById: 'dr-original',
          approvedAt: OLD_DATE,
        },
      });
      expect(result).toEqual({ success: true, messageId: 'prov-123' });
    });

    it('rejects when the invoice has no payment session', async () => {
      mocks.persistence.invoice.findUnique.mockImplementation(async () =>
        defaultInvoice({ paymentSessions: [] }),
      );

      await expect(
        service.resendInvoice('clinic-1', 'user-1', 'DOCTOR', 'inv-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });

    it('rejects when the invoice template is not configured', async () => {
      mocks.templatesService.resolveTemplate.mockImplementation(
        async () => null,
      );

      await expect(
        service.resendInvoice('clinic-1', 'user-1', 'DOCTOR', 'inv-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sendMessage.execute).not.toHaveBeenCalled();
    });
  });
});
