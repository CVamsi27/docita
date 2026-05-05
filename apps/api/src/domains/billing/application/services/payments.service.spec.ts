import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentSessionStatus, Prisma } from '@workspace/db';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { PushNotificationService } from '@/shared/modules/messaging/notifications/push-notification.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { IPaymentLinkProvider } from '@/domains/payments/core/ports/payment-link-provider.port';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import type { IPaymentSessionRepository } from '@/domains/billing/core/repositories/payment-session.repository';
import type { IInvoiceRepository } from '@/domains/billing/core/repositories/invoice.repository';
import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';
import { PaymentsService } from './payments.service';

function buildInvoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    id: 'inv_1',
    patientId: 'pat_1',
    clinicId: 'clinic_1',
    invoiceNumber: 'DC-1',
    invoiceType: 'BILL_OF_SUPPLY',
    currency: 'INR',
    total: 500,
    subtotal: 500,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 500,
    taxSummary: null,
    sellerTaxSnapshot: null,
    buyerTaxSnapshot: null,
    placeOfSupplyStateCode: null,
    placeOfSupplyStateName: null,
    reverseCharge: false,
    issuedAt: null,
    dueDate: null,
    eInvoiceRequired: false,
    eInvoiceIrn: null,
    eInvoiceQrCode: null,
    eInvoiceAcknowledgedAt: null,
    status: InvoiceStatus.PENDING,
    items: [] as Prisma.JsonValue,
    doctorName: null,
    doctorEmail: null,
    doctorPhone: null,
    doctorSpecialization: null,
    doctorRegistrationNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    pdfUrl: null,
    pdfGeneratedAt: null,
    pdfTemplateVersion: 1,
    patient: {
      id: 'pat_1',
      firstName: 'A',
      lastName: 'B',
      phoneNumber: '+910000000000',
      email: null,
      address: null,
    },
    ...overrides,
  };
}

describe('PaymentsService', () => {
  const repository: jest.Mocked<IPaymentSessionRepository> = {
    create: jest.fn<IPaymentSessionRepository['create']>(),
    findById: jest.fn<IPaymentSessionRepository['findById']>(),
    findByProviderSessionId:
      jest.fn<IPaymentSessionRepository['findByProviderSessionId']>(),
    update: jest.fn<IPaymentSessionRepository['update']>(),
    delete: jest.fn<IPaymentSessionRepository['delete']>(),
    findPendingReminders:
      jest.fn<IPaymentSessionRepository['findPendingReminders']>(),
    findByInvoiceId: jest.fn<IPaymentSessionRepository['findByInvoiceId']>(),
  };

  const invoiceRepository: jest.Mocked<IInvoiceRepository> = {
    findAll: jest.fn<IInvoiceRepository['findAll']>(),
    findById: jest.fn<IInvoiceRepository['findById']>(),
    create: jest.fn<IInvoiceRepository['create']>(),
    update: jest.fn<IInvoiceRepository['update']>(),
    delete: jest.fn<IInvoiceRepository['delete']>(),
    findPatientContext: jest.fn<IInvoiceRepository['findPatientContext']>(),
    nextInvoiceNumber: jest.fn<IInvoiceRepository['nextInvoiceNumber']>(),
  };

  const sendMessage = Object.create(
    SendMessageUseCase.prototype,
  ) as SendMessageUseCase;
  sendMessage.execute = jest.fn<SendMessageUseCase['execute']>();

  const pushNotifications = Object.create(
    PushNotificationService.prototype,
  ) as PushNotificationService;

  const configService = Object.create(
    AppConfigService.prototype,
  ) as AppConfigService;
  configService.getCurrencyCode = jest
    .fn<AppConfigService['getCurrencyCode']>()
    .mockReturnValue('INR');
  configService.getPaymentLinkTtlMinutes = jest
    .fn<AppConfigService['getPaymentLinkTtlMinutes']>()
    .mockReturnValue(60);
  configService.getFrontendAppUrl = jest
    .fn<AppConfigService['getFrontendAppUrl']>()
    .mockReturnValue('https://app.example.com');

  const paymentLinkProvider = {
    provider: PaymentProvider.RAZORPAY,
    capabilities: {
      supportsPaymentLinks: true,
      supportsSubscriptions: false,
      supportsRecurringPayments: false,
      supportsRefunds: false,
      supportsWebhooks: true,
      supportedCurrencies: ['INR'],
      supportedPaymentMethods: ['card'],
    },
    isAvailable: jest
      .fn<IPaymentLinkProvider['isAvailable']>()
      .mockResolvedValue(true),
    createPaymentLink: jest.fn<IPaymentLinkProvider['createPaymentLink']>(),
    getPaymentLink: jest
      .fn<IPaymentLinkProvider['getPaymentLink']>()
      .mockResolvedValue(null),
    cancelPaymentLink: jest
      .fn<IPaymentLinkProvider['cancelPaymentLink']>()
      .mockResolvedValue(undefined),
  } as unknown as IPaymentLinkProvider;

  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(
      repository,
      invoiceRepository,
      sendMessage,
      pushNotifications,
      configService,
      paymentLinkProvider,
    );
  });

  describe('markInvoicePaidManually', () => {
    it('throws NotFoundException when invoice is missing', async () => {
      invoiceRepository.findById.mockResolvedValue(null);

      await expect(
        service.markInvoicePaidManually({
          invoiceId: 'missing',
          clinicId: 'clinic_1',
          performedByUserId: 'user_1',
          paymentMethod: 'CASH',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(invoiceRepository.update).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when invoice is already PAID', async () => {
      invoiceRepository.findById.mockResolvedValue(
        buildInvoice({ status: InvoiceStatus.PAID }),
      );

      await expect(
        service.markInvoicePaidManually({
          invoiceId: 'inv_1',
          clinicId: 'clinic_1',
          performedByUserId: 'user_1',
          paymentMethod: 'CASH',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(invoiceRepository.update).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when invoice is CANCELLED', async () => {
      invoiceRepository.findById.mockResolvedValue(
        buildInvoice({ status: InvoiceStatus.CANCELLED }),
      );

      await expect(
        service.markInvoicePaidManually({
          invoiceId: 'inv_1',
          clinicId: 'clinic_1',
          performedByUserId: 'user_1',
          paymentMethod: 'CASH',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(invoiceRepository.update).not.toHaveBeenCalled();
    });

    it('records channel, normalized OTHER, and reference in session meta', async () => {
      invoiceRepository.findById.mockResolvedValue(buildInvoice());
      invoiceRepository.update.mockResolvedValue(
        buildInvoice({ status: InvoiceStatus.PAID }),
      );
      repository.create.mockResolvedValue({} as never);

      await service.markInvoicePaidManually({
        invoiceId: 'inv_1',
        clinicId: 'clinic_1',
        performedByUserId: 'user_1',
        paymentMethod: 'OTHER',
        reference: 'RRN123',
        notes: 'Paid at desk',
      });

      expect(invoiceRepository.update).toHaveBeenCalledWith(
        'inv_1',
        { status: InvoiceStatus.PAID },
        'clinic_1',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'manual',
          status: PaymentSessionStatus.CAPTURED,
          meta: expect.objectContaining({
            channel: 'OTHER_ONLINE',
            method: 'OTHER_ONLINE',
            reference: 'RRN123',
            notes: 'Paid at desk',
            performedBy: 'user_1',
            amount: 500,
          }),
        }),
      );
    });

    it('uses UPI_QR channel without rewriting', async () => {
      invoiceRepository.findById.mockResolvedValue(buildInvoice());
      invoiceRepository.update.mockResolvedValue(
        buildInvoice({ status: InvoiceStatus.PAID }),
      );
      repository.create.mockResolvedValue({} as never);

      await service.markInvoicePaidManually({
        invoiceId: 'inv_1',
        clinicId: 'clinic_1',
        performedByUserId: 'user_1',
        paymentMethod: 'UPI_QR',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            channel: 'UPI_QR',
            method: 'UPI_QR',
          }),
        }),
      );
    });
  });
});
