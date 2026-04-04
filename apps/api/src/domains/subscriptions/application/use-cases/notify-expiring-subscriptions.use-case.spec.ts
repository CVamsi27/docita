import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotifyExpiringSubscriptionsUseCase } from './notify-expiring-subscriptions.use-case';

describe('NotifyExpiringSubscriptionsUseCase', () => {
  const findSubscriptionsMock =
    jest.fn<(args: unknown) => Promise<unknown[]>>();
  const findRemindersMock =
    jest.fn<(args: unknown) => Promise<Array<{ clinicId: string }>>>();
  const createManyRemindersMock =
    jest.fn<(args: unknown) => Promise<{ count: number }>>();

  const prisma = {
    subscription: {
      findMany: findSubscriptionsMock,
    },
    subscriptionReminder: {
      findMany: findRemindersMock,
      createMany: createManyRemindersMock,
    },
  };

  let useCase: NotifyExpiringSubscriptionsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new NotifyExpiringSubscriptionsUseCase(
      {} as never,
      prisma as never,
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
