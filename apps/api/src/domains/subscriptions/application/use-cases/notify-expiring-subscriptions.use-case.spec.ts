import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotifyExpiringSubscriptionsUseCase } from './notify-expiring-subscriptions.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { ISubscriptionRepository } from '@/domains/subscriptions/application/ports';

describe('NotifyExpiringSubscriptionsUseCase', () => {
  const findSubscriptionsMock =
    jest.fn<(args: unknown) => Promise<unknown[]>>();
  const findRemindersMock =
    jest.fn<(args: unknown) => Promise<Array<{ clinicId: string }>>>();
  const createManyRemindersMock =
    jest.fn<(args: unknown) => Promise<{ count: number }>>();

  const prismaSubscription = {
    findMany: findSubscriptionsMock,
  };
  const prismaSubscriptionReminder = {
    findMany: findRemindersMock,
    createMany: createManyRemindersMock,
  };

  const subscriptionRepository: ISubscriptionRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    findByClinicId: jest.fn(async () => null),
    findByStatus: jest.fn(async () => []),
    findApproachingRenewal: jest.fn(async () => []),
    update: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    savePayment: jest.fn(async () => undefined),
    updatePaymentStatus: jest.fn(async () => undefined),
    findPaymentsByClinicId: jest.fn(async () => []),
  };

  let useCase: NotifyExpiringSubscriptionsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    const prisma = Object.create(PrismaService.prototype) as PrismaService;
    Object.defineProperties(prisma, {
      subscription: {
        value: prismaSubscription,
        writable: true,
      },
      subscriptionReminder: {
        value: prismaSubscriptionReminder,
        writable: true,
      },
    });

    useCase = new NotifyExpiringSubscriptionsUseCase(
      subscriptionRepository,
      prisma,
    );
  });

  it('creates at most one reminder per clinic after prefetch dedupe', async () => {
    findSubscriptionsMock.mockResolvedValue([
      { id: 'sub-1', clinicId: 'clinic-1' },
      { id: 'sub-2', clinicId: 'clinic-1' },
      { id: 'sub-3', clinicId: 'clinic-2' },
    ]);
    findRemindersMock.mockResolvedValue([{ clinicId: 'clinic-2' }]);
    createManyRemindersMock.mockResolvedValue({ count: 1 });

    await useCase.execute({
      targetDate: new Date('2026-04-10T00:00:00.000Z'),
      reminderType: 'expiry_7d',
    });

    expect(findRemindersMock).toHaveBeenCalledTimes(1);
    expect(createManyRemindersMock).toHaveBeenCalledTimes(1);
    expect(createManyRemindersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            clinicId: 'clinic-1',
            subscriptionId: 'sub-1',
            type: 'expiry_7d',
            channel: 'EMAIL',
          }),
        ],
      }),
    );
  });

  it('skips reminder writes when no subscriptions expire for the target date', async () => {
    findSubscriptionsMock.mockResolvedValue([]);

    await useCase.execute({
      targetDate: new Date('2026-04-10T00:00:00.000Z'),
      reminderType: 'expiry_7d',
    });

    expect(findRemindersMock).not.toHaveBeenCalled();
    expect(createManyRemindersMock).not.toHaveBeenCalled();
  });
});
