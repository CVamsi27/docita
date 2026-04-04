import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OverageBillingScheduler } from './overage-billing.scheduler';

describe('OverageBillingScheduler', () => {
  const upsertPaymentMock = jest.fn<(args: unknown) => Promise<unknown>>();
  const updatePaymentMock = jest.fn<(args: unknown) => Promise<unknown>>();

  const prisma = {
    subscriptionPayment: {
      upsert: upsertPaymentMock,
      update: updatePaymentMock,
    },
  };

  const overageCalculationService = {
    calculateOverageCharges: jest.fn(),
  };
  const usageTrackingService = {
    getCurrentUsage: jest.fn(),
  };
  const emailService = {
    send: jest.fn(),
  };
  const configService = {
    getFrontendAppUrl: jest.fn().mockReturnValue('https://app.docita.test'),
    getRazorpayKeyId: jest.fn().mockReturnValue('rzp_test_key'),
    getRazorpayKeySecret: jest.fn().mockReturnValue('rzp_test_secret'),
  };
  const paymentLinkProvider = {
    createPaymentLink: jest.fn(),
  };

  let scheduler: OverageBillingScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new OverageBillingScheduler(
      prisma as never,
      overageCalculationService as never,
      usageTrackingService as never,
      emailService as never,
      configService as never,
      paymentLinkProvider as never,
    );
  });

  it('upserts overage payment by composite clinicId+invoiceNumber key', async () => {
    const upserted = {
      id: 'pay_1',
      clinicId: 'clinic_1',
      amountCents: 2500,
      currency: 'INR',
      status: 'failed',
      invoiceUrl: null,
      invoiceNumber: 'OVG-202603-CLINIC',
      description: 'old',
    };
    const updated = {
      ...upserted,
      status: 'pending',
      description: 'updated',
    };
    upsertPaymentMock.mockResolvedValue(upserted);
    updatePaymentMock.mockResolvedValue(updated);

    const ensureLinkMock = jest
      .spyOn(
        scheduler as unknown as {
          ensureOveragePaymentLink: (
            payment: Record<string, unknown>,
          ) => Promise<void>;
        },
        'ensureOveragePaymentLink',
      )
      .mockResolvedValue(undefined);

    await (
      scheduler as unknown as {
        createOrUpdateOverageInvoicePayment: (params: unknown) => Promise<void>;
      }
    ).createOrUpdateOverageInvoicePayment({
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
    const paidPayment = {
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
      .spyOn(
        scheduler as unknown as {
          ensureOveragePaymentLink: (
            payment: Record<string, unknown>,
          ) => Promise<void>;
        },
        'ensureOveragePaymentLink',
      )
      .mockResolvedValue(undefined);

    await (
      scheduler as unknown as {
        createOrUpdateOverageInvoicePayment: (params: unknown) => Promise<void>;
      }
    ).createOrUpdateOverageInvoicePayment({
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
