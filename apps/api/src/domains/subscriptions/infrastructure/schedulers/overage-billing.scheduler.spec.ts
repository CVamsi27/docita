import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import type { IOverageCalculation } from '@/domains/billing/application/ports';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { IPaymentLinkProvider } from '@/domains/payments/core/ports';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import { OverageInvoiceComposer } from './overage-invoice.composer';
import { BillMonthlyOveragesUseCase } from '@/domains/subscriptions/application/use-cases/bill-monthly-overages.use-case';

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

describe('BillMonthlyOveragesUseCase (overage payment upsert)', () => {
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

  const overageCalculation = {
    calculateOverageCharges:
      jest.fn<IOverageCalculation['calculateOverageCharges']>(),
  } satisfies IOverageCalculation;

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

  let useCase: BillMonthlyOveragesUseCase;
  const invoiceComposer = new OverageInvoiceComposer();

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new BillMonthlyOveragesUseCase(
      prisma,
      overageCalculation,
      configService,
      paymentLinkProvider,
      invoiceComposer,
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
    Reflect.set(useCase, 'ensureOveragePaymentLink', ensureLinkMock);
    const createOrUpdate = Reflect.get(
      useCase,
      'createOrUpdateOverageInvoicePayment',
    ) as (params: OverageInvoiceParams) => Promise<void>;

    await createOrUpdate.call(useCase, {
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
    Reflect.set(useCase, 'ensureOveragePaymentLink', ensureLinkMock);
    const createOrUpdate = Reflect.get(
      useCase,
      'createOrUpdateOverageInvoicePayment',
    ) as (params: OverageInvoiceParams) => Promise<void>;

    await createOrUpdate.call(useCase, {
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
