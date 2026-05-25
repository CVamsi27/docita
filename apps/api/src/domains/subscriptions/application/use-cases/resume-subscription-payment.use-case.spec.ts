import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ResumeSubscriptionPaymentUseCase } from './resume-subscription-payment.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import type { IPaymentLinkProvider } from '@/domains/payments/core/ports';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('ResumeSubscriptionPaymentUseCase', () => {
  const findPaymentByIdMock =
    jest.fn<ISubscriptionRepository['findPaymentById']>();
  const findBillingContactMock =
    jest.fn<ISubscriptionRepository['findBillingContact']>();

  const subscriptionRepo: ISubscriptionRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    findByClinicId: jest.fn(async () => null),
    findByStatus: jest.fn(async () => []),
    findApproachingRenewal: jest.fn(async () => []),
    update: jest.fn(async () => undefined),
    markClinicPastDue: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    findBillingContact: findBillingContactMock,
    findExpiryReminderCandidates: jest.fn(async () => []),
    findGraceDeadlineReminderCandidates: jest.fn(async () => []),
    findRecentReminderClinicIds: jest.fn(async () => []),
    createSubscriptionReminders: jest.fn(async () => undefined),
    savePayment: jest.fn(async () => undefined),
    updatePaymentStatus: jest.fn(async () => undefined),
    updatePaymentStatusById: jest.fn(async () => undefined),
    findPaymentsByClinicId: jest.fn(async () => []),
    findPaymentById: findPaymentByIdMock,
    findPaymentByOrderId: jest.fn(async () => null),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    expireOtherPendingSubscriptionCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: jest.fn(async () => null),
  };

  const paymentLinkProvider: IPaymentLinkProvider = {
    createPaymentLink: jest.fn(async () => ({
      id: 'plink_1',
      url: 'https://pay.example.com/1',
      shortUrl: 'https://rzp.io/i/1',
    })),
  } as unknown as IPaymentLinkProvider;

  const configService = {
    getFrontendAppUrl: () => 'http://localhost:3000',
  } as unknown as AppConfigService;

  const clinicOps: IClinicOperations = {
    getClinicDetails: jest.fn(async () => ({
      id: 'clinic-1',
      name: 'Clinic',
      email: 'clinic@example.com',
      phone: '1111111111',
    })),
  } as unknown as IClinicOperations;

  let useCase: ResumeSubscriptionPaymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    findBillingContactMock.mockResolvedValue({
      name: 'Admin',
      email: 'admin@example.com',
      phoneNumber: '9876543210',
    });
    useCase = new ResumeSubscriptionPaymentUseCase(
      configService,
      paymentLinkProvider,
      subscriptionRepo,
      clinicOps,
    );
  });

  it('returns existing invoiceUrl when present', async () => {
    findPaymentByIdMock.mockResolvedValue({
      id: 'pay_1',
      clinicId: 'clinic-1',
      amountCents: 99900,
      currency: 'INR',
      status: 'pending',
      invoiceUrl: 'https://rzp.io/i/existing',
    });

    const result = await useCase.execute({
      clinicId: 'clinic-1',
      paymentId: 'pay_1',
    });

    expect(result).toEqual({
      id: 'pay_1',
      payUrl: 'https://rzp.io/i/existing',
    });
    expect(paymentLinkProvider.createPaymentLink).not.toHaveBeenCalled();
    expect(subscriptionRepo.updatePaymentLink).not.toHaveBeenCalled();
  });

  it('prefills payment link customer with admin phone', async () => {
    findPaymentByIdMock.mockResolvedValue({
      id: 'pay_2',
      clinicId: 'clinic-1',
      amountCents: 49900,
      currency: 'INR',
      status: 'pending',
      description: 'STARTER MONTHLY subscription',
    });

    await useCase.execute({
      clinicId: 'clinic-1',
      paymentId: 'pay_2',
    });

    expect(paymentLinkProvider.createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: expect.objectContaining({
          email: 'admin@example.com',
          phone: '9876543210',
        }),
      }),
    );
  });
});
