import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReferralAccrualService } from '@/domains/subscriptions/application/services/referral-accrual.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { ReferralAccrualScheduler } from './referral-accrual.scheduler';

describe('ReferralAccrualScheduler', () => {
  const accrueMock = jest.fn<ReferralAccrualService['accrueAllDuePayouts']>();
  const accrualService = Object.create(
    ReferralAccrualService.prototype,
  ) as ReferralAccrualService;
  accrualService.accrueAllDuePayouts = accrueMock;

  let scheduler: ReferralAccrualScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    accrueMock.mockResolvedValue({ referralsProcessed: 3, payoutsCreated: 2 });
    // Fresh instance per test: the scheduler latches `databaseAccessDisabled`
    // after a DB auth failure, which must not leak across tests.
    scheduler = new ReferralAccrualScheduler(accrualService);
  });

  it('is wired to the daily referral-accrual cron expression', () => {
    expect(CRON_SCHEDULES.REFERRAL_ACCRUAL).toBe('30 3 * * *');
  });

  it('delegates to the accrual service on each tick', async () => {
    await scheduler.accrueReferralPayouts();

    expect(accrueMock).toHaveBeenCalledTimes(1);
  });

  it('stops calling the service once a database authentication failure occurs', async () => {
    accrueMock.mockRejectedValueOnce(
      new Error('password authentication failed'),
    );

    await scheduler.accrueReferralPayouts();
    await scheduler.accrueReferralPayouts();

    expect(accrueMock).toHaveBeenCalledTimes(1);
  });

  it('isolates non-auth failures so the next tick still runs', async () => {
    accrueMock.mockRejectedValueOnce(new Error('transient boom'));

    await expect(scheduler.accrueReferralPayouts()).resolves.toBeUndefined();
    await scheduler.accrueReferralPayouts();

    expect(accrueMock).toHaveBeenCalledTimes(2);
  });
});
