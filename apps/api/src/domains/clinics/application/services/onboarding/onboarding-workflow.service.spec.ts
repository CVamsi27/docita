import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Prisma, SubscriptionStatus } from '@workspace/db';
import {
  BillingCycle,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  IOnboardingTxRepository,
  OnboardingPaymentWriteData,
  OnboardingSubscriptionWriteData,
} from '@/domains/clinics/core/repositories/onboarding-tx.repository.interface';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';

describe('OnboardingWorkflowService', () => {
  const validation = {
    getTierPricing: jest.fn(() => 99900),
    getTierLimits: jest.fn(() => ({
      includedPatients: 300,
      includedAppointments: 500,
      includedStorageGB: 5,
      includedUsers: 2,
    })),
  } as unknown as OnboardingValidationService;

  const tx = {
    subscription: {
      create: jest.fn(async ({ data }: { data: unknown }) => ({
        id: 'sub_1',
        ...(data as Record<string, unknown>),
      })),
    },
    subscriptionPayment: {
      create: jest.fn(async () => ({})),
    },
    clinic: {
      update: jest.fn(async () => ({})),
    },
  } as unknown as Prisma.TransactionClient;

  let service: OnboardingWorkflowService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-29T00:00:00.000Z'));
    jest.clearAllMocks();
    const repository = {
      createSubscription: jest.fn(
        (
          txArg: Prisma.TransactionClient,
          data: OnboardingSubscriptionWriteData,
        ) => txArg.subscription.create({ data: data as never }),
      ),
      createSubscriptionPayment: jest.fn(
        (txArg: Prisma.TransactionClient, data: OnboardingPaymentWriteData) =>
          txArg.subscriptionPayment
            .create({ data: data as never })
            .then(() => undefined),
      ),
      applyClinicTierAndTrial: jest.fn(
        (
          txArg: Prisma.TransactionClient,
          clinicId: string,
          tier: string,
          status: SubscriptionStatus,
          trialEndsAt: Date | null,
        ) =>
          txArg.clinic
            .update({
              where: { id: clinicId },
              data: {
                tier: tier as never,
                subscriptionStatus: status,
                trialEndsAt,
              },
            })
            .then(() => undefined),
      ),
    } as unknown as IOnboardingTxRepository;
    service = new OnboardingWorkflowService(validation, repository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates Starter subscription in trialing state when skipPayment is used', async () => {
    await service.createSubscription(
      tx,
      'clinic-1',
      {
        tier: ClinicTier.STARTER,
        billingCycle: BillingCycle.MONTHLY,
        currency: 'INR',
      },
      {
        skipPayment: true,
        autoPay: true,
      },
    );

    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clinicId: 'clinic-1',
        plan: ClinicTier.STARTER,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: new Date('2026-04-29T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-05-29T00:00:00.000Z'),
      }),
    });
    expect(tx.subscriptionPayment.create).not.toHaveBeenCalled();
    expect(tx.clinic.update).toHaveBeenCalledWith({
      where: { id: 'clinic-1' },
      data: {
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEndsAt: new Date('2026-05-29T00:00:00.000Z'),
      },
    });
  });
});
