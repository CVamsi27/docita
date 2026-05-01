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
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { PrismaService } from '@/prisma/prisma.service';

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
    service = new OnboardingWorkflowService({} as PrismaService, validation);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates unpaid Starter onboarding as a monthly trial', async () => {
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
