import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { OverageCalculationService } from '@/domains/billing/core/services/overage-calculation.service';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { IPaymentLinkProvider } from '@/domains/payments/core/ports';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import { OverageBillingScheduler } from './overage-billing.scheduler';

type OverageBreakdown = Record<
  string,
  { quantity: number; rate: number; charge: number }
>;

type OverageInvoiceParams = {
  clinicId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  totalOverageCharges: number;
  currency: string;
  breakdown: OverageBreakdown;
};

type SubscriptionPaymentRecord = {
  id: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  invoiceNumber: string | null;
  description: string | null;
};

describe('OverageBillingScheduler', () => {
  const upsertPaymentMock = jest.fn<
    (_args: {
      where: {
        clinicId_invoiceNumber: { clinicId: string; invoiceNumber: string };
      };
      update: {
        subscriptionId: string;
        amountCents: number;
        currency: string;
        description: string;
      };
      create: {
        clinicId: string;
        subscriptionId: string;
        amountCents: number;
        currency: string;
        status: string;
        invoiceNumber: string;
        description: string;
      };
    }) => Promise<SubscriptionPaymentRecord>
  >();

  const updatePaymentMock =
    jest.fn<
      (_args: {
        where: { id: string };
        data: { status: 'pending' };
      }) => Promise<SubscriptionPaymentRecord>
    >();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperty(prisma, 'subscriptionPayment', {
    value: {
      upsert: upsertPaymentMock,
      update: updatePaymentMock,
    },
    writable: true,
  });

  const overageCalculationService = Object.create(
    OverageCalculationService.prototype,
  ) as OverageCalculationService;
  overageCalculationService.calculateOverageCharges =
    jest.fn<OverageCalculationService['calculateOverageCharges']>();

  const usageTrackingService = Object.create(
    UsageTrackingService.prototype,
  ) as UsageTrackingService;
  usageTrackingService.getCurrentUsage =
    jest.fn<UsageTrackingService['getCurrentUsage']>();

  const emailService = Object.create(EmailService.prototype) as EmailService;
  emailService.send = jest.fn<EmailService['send']>();

  const configService = Object.create(
    AppConfigService.prototype,
  ) as AppConfigService;
  configService.getFrontendAppUrl = jest
    .fn<() => string>()
    .mockReturnValue('https://app.docita.test');
  configService.getRazorpayKeyId = jest
    .fn<() => string>()
    .mockReturnValue('rzp_test_key');
  configService.getRazorpayKeySecret = jest
    .fn<() => string>()
    .mockReturnValue('rzp_test_secret');

  const paymentLinkProvider: IPaymentLinkProvider = {
    provider: PaymentProvider.RAZORPAY,
    capabilities: {
      supportsPaymentLinks: true,
      supportsSubscriptions: false,
      supportsRecurringPayments: false,
      supportsRefunds: false,
      supportsWebhooks: false,
      supportedCurrencies: ['INR'],
      supportedPaymentMethods: ['card'],
    },
    isAvailable: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    createPaymentLink: jest.fn<IPaymentLinkProvider['createPaymentLink']>(),
    getPaymentLink: jest.fn<IPaymentLinkProvider['getPaymentLink']>(),
    cancelPaymentLink: jest.fn<IPaymentLinkProvider['cancelPaymentLink']>(),
  };

  let scheduler: OverageBillingScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new OverageBillingScheduler(
      prisma,
      overageCalculationService,
      usageTrackingService,
      emailService,
      configService,
      paymentLinkProvider,
    );
  });

  it('upserts overage payment by composite clinicId+invoiceNumber key', async () => {
    const upserted: SubscriptionPaymentRecord = {
      id: 'pay_1',
      clinicId: 'clinic_1',
      amountCents: 2500,
      currency: 'INR',
      status: 'failed',
      invoiceUrl: null,
      invoiceNumber: 'OVG-202603-CLINIC',
      description: 'old',
    };

    const updated: SubscriptionPaymentRecord = {
      ...upserted,
      status: 'pending',
      description: 'updated',
    };

    upsertPaymentMock.mockResolvedValue(upserted);
    updatePaymentMock.mockResolvedValue(updated);

    const ensureLinkMock = jest
      .fn<(payment: SubscriptionPaymentRecord) => Promise<void>>()
      .mockResolvedValue();
    Reflect.set(scheduler, 'ensureOveragePaymentLink', ensureLinkMock);
    const createOrUpdate = Reflect.get(
      scheduler,
      'createOrUpdateOverageInvoicePayment',
    ) as (params: OverageInvoiceParams) => Promise<void>;

    await createOrUpdate.call(scheduler, {
      clinicId: 'clinic_1',
      subscriptionId: 'sub_1',
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-03-31T23:59:59.999Z'),
      totalOverageCharges: 25,
      currency: 'INR',
      breakdown: {
        consultations: {
          quantity: 5,
          rate: 5,
          charge: 25,
        },
      },
    });

    expect(upsertPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clinicId_invoiceNumber: expect.objectContaining({
            clinicId: 'clinic_1',
            invoiceNumber: expect.stringMatching(/^OVG-202603-[A-Z0-9_]+$/),
          }),
        },
      }),
    );
    expect(updatePaymentMock).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: { status: 'pending' },
    });
    expect(ensureLinkMock).toHaveBeenCalledWith(updated);
  });

  it('preserves paid status during idempotent upsert updates', async () => {
    const paidPayment: SubscriptionPaymentRecord = {
      id: 'pay_paid',
      clinicId: 'clinic_1',
      amountCents: 2500,
      currency: 'INR',
      status: 'paid',
      invoiceUrl: 'https://invoice',
      invoiceNumber: 'OVG-202603-INIC_1',
      description: 'paid overage',
    };

    upsertPaymentMock.mockResolvedValue(paidPayment);

    const ensureLinkMock = jest
      .fn<(payment: SubscriptionPaymentRecord) => Promise<void>>()
      .mockResolvedValue();
    Reflect.set(scheduler, 'ensureOveragePaymentLink', ensureLinkMock);
    const createOrUpdate = Reflect.get(
      scheduler,
      'createOrUpdateOverageInvoicePayment',
    ) as (params: OverageInvoiceParams) => Promise<void>;

    await createOrUpdate.call(scheduler, {
      clinicId: 'clinic_1',
      subscriptionId: 'sub_1',
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-03-31T23:59:59.999Z'),
      totalOverageCharges: 25,
      currency: 'INR',
      breakdown: {
        consultations: {
          quantity: 5,
          rate: 5,
          charge: 25,
        },
      },
    });

    expect(updatePaymentMock).not.toHaveBeenCalled();
    expect(ensureLinkMock).toHaveBeenCalledWith(paidPayment);
  });
});
