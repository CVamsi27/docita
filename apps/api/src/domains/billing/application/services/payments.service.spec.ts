import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  PaymentSession,
  PaymentSessionStatus,
  Prisma,
  InvoiceStatus,
} from '@workspace/db';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { PushNotificationService } from '@/shared/modules/messaging/notifications/push-notification.service';
import { IPaymentLinkProvider } from '@/domains/payments/core/ports/payment-link-provider.port';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import { IPaymentSessionRepository } from '@/domains/billing/core/repositories/payment-session.repository';
import {
  IInvoiceRepository,
  InvoiceDetail,
} from '@/domains/billing/core/repositories/invoice.repository';
import { PaymentsService } from './payments.service';

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
  sendMessage.execute = jest
    .fn<SendMessageUseCase['execute']>()
    .mockResolvedValue({ messageId: 'message-1' });

  const pushNotifications = Object.create(
    PushNotificationService.prototype,
  ) as PushNotificationService;

  const configService: Pick<
    AppConfigService,
    'getPaymentLinkTtlMinutes' | 'getFrontendAppUrl' | 'getCurrencyCode'
  > = {
    getPaymentLinkTtlMinutes: () => 30,
    getFrontendAppUrl: () => 'https://app.docita.test',
    getCurrencyCode: () => 'INR',
  };

  const paymentLinkProvider: jest.Mocked<IPaymentLinkProvider> = {
    provider: PaymentProvider.RAZORPAY,
    capabilities: {
      supportsPaymentLinks: true,
      supportsSubscriptions: false,
      supportsRecurringPayments: false,
      supportsRefunds: false,
      supportsWebhooks: true,
      supportedCurrencies: ['INR'],
      supportedPaymentMethods: ['upi', 'card'],
    },
    isAvailable: jest.fn<IPaymentLinkProvider['isAvailable']>(),
    createPaymentLink: jest.fn<IPaymentLinkProvider['createPaymentLink']>(),
    getPaymentLink: jest.fn<IPaymentLinkProvider['getPaymentLink']>(),
    cancelPaymentLink: jest.fn<IPaymentLinkProvider['cancelPaymentLink']>(),
  };

  let service: PaymentsService;

  const buildInvoice = (
    overrides: Partial<InvoiceDetail> = {},
  ): InvoiceDetail =>
    ({
      id: 'invoice-1',
      patientId: 'patient-1',
      clinicId: 'clinic-1',
      status: InvoiceStatus.PENDING,
      total: 250,
      patient: {
        id: 'patient-1',
        firstName: 'Asha',
        lastName: 'Rao',
        phoneNumber: '9999999999',
        email: 'asha@example.com',
        address: null,
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          address: null,
          phone: null,
          email: null,
          logo: null,
          currency: 'INR',
          branding: Prisma.DbNull,
          slaSignatureUrl: null,
          settings: Prisma.DbNull,
        },
      },
      ...overrides,
    }) as unknown as InvoiceDetail;

  const buildPaymentSession = (): PaymentSession =>
    ({
      id: 'session-1',
      clinicId: 'clinic-1',
      invoiceId: 'invoice-1',
      patientId: 'patient-1',
      provider: 'razorpay',
      amount: 25_000,
      currency: 'INR',
      status: PaymentSessionStatus.CREATED,
      expiresAt: new Date('2026-01-01T00:30:00.000Z'),
      paymentLink: 'https://pay.docita.test/session-1',
      shortUrl: 'https://pay.docita.test/s/1',
    }) as unknown as PaymentSession;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(
      repository,
      invoiceRepository,
      sendMessage,
      pushNotifications,
      configService as AppConfigService,
      paymentLinkProvider,
    );
  });

  it('requires payment links to use an invoice owned by the clinic', async () => {
    invoiceRepository.findById.mockResolvedValue(null);

    await expect(
      service.createPaymentLink({
        invoiceId: 'invoice-1',
        amount: 250,
        currency: 'INR',
        patientId: 'patient-1',
        clinicId: 'clinic-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(invoiceRepository.findById).toHaveBeenCalledWith(
      'invoice-1',
      'clinic-2',
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(paymentLinkProvider.createPaymentLink).not.toHaveBeenCalled();
  });

  it('rejects payment links when the patient does not match the invoice', async () => {
    invoiceRepository.findById.mockResolvedValue(buildInvoice());

    await expect(
      service.createPaymentLink({
        invoiceId: 'invoice-1',
        amount: 250,
        currency: 'INR',
        patientId: 'patient-2',
        clinicId: 'clinic-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
    expect(paymentLinkProvider.createPaymentLink).not.toHaveBeenCalled();
  });

  it('marks manual payments using a clinic-scoped invoice update', async () => {
    invoiceRepository.findById.mockResolvedValue(buildInvoice());
    invoiceRepository.update.mockResolvedValue(
      buildInvoice({ status: InvoiceStatus.PAID }),
    );
    repository.create.mockResolvedValue(buildPaymentSession());

    await service.markInvoicePaidManually({
      invoiceId: 'invoice-1',
      clinicId: 'clinic-1',
      performedByUserId: 'user-1',
      paymentMethod: 'cash',
    });

    expect(invoiceRepository.update).toHaveBeenCalledWith(
      'invoice-1',
      { status: InvoiceStatus.PAID },
      'clinic-1',
    );
  });
});
