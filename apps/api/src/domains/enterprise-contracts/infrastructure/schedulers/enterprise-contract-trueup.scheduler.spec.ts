import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { EnterpriseContractsService } from '@/domains/enterprise-contracts/application/services/enterprise-contracts.service';
import { BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { EnterpriseContractTrueUpScheduler } from './enterprise-contract-trueup.scheduler';

describe('EnterpriseContractTrueUpScheduler', () => {
  const runUnrestrictedMock =
    jest.fn<(cb: () => Promise<unknown>) => Promise<unknown>>();
  const findManyMock = jest.fn<
    (args?: unknown) => Promise<Array<{ id: string; contractNumber: string }>>
  >();
  const evaluateMock =
    jest.fn<EnterpriseContractsService['evaluateAndAlertTrueUp']>();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    runUnrestricted: {
      value: runUnrestrictedMock.mockImplementation(
        async (cb: () => Promise<unknown>) => cb(),
      ),
      writable: true,
    },
    enterpriseContract: {
      value: { findMany: findManyMock },
      writable: true,
    },
  });

  const contractsService = Object.create(
    EnterpriseContractsService.prototype,
  ) as EnterpriseContractsService;
  contractsService.evaluateAndAlertTrueUp = evaluateMock;

  const clock = { now: () => new Date('2026-06-12T00:00:00.000Z') };

  let scheduler: EnterpriseContractTrueUpScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    runUnrestrictedMock.mockImplementation(
      async (cb: () => Promise<unknown>) => cb(),
    );
    findManyMock.mockResolvedValue([
      { id: 'c1', contractNumber: 'EC-1' },
      { id: 'c2', contractNumber: 'EC-2' },
    ]);
    evaluateMock.mockResolvedValue({ alerted: false, observedPercent: 0 });
    // Fresh instance per test: the scheduler latches `databaseAccessDisabled`
    // after a DB auth failure, which must not leak across tests.
    scheduler = new EnterpriseContractTrueUpScheduler(
      prisma,
      contractsService,
      clock,
    );
  });

  it('is wired to the daily 03:15 true-up cron expression', () => {
    expect(CRON_SCHEDULES.ENTERPRISE_CONTRACT_TRUEUP).toBe('15 3 * * *');
  });

  it('scans active contracts inside an unrestricted scope with a capped read and evaluates each', async () => {
    await scheduler.evaluateAll();

    expect(runUnrestrictedMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        take: BULK_READ_LIMIT,
      }),
    );
    expect(evaluateMock).toHaveBeenCalledWith('c1');
    expect(evaluateMock).toHaveBeenCalledWith('c2');
  });

  it('isolates a per-contract evaluation failure via allSettled', async () => {
    evaluateMock
      .mockRejectedValueOnce(new Error('contract boom'))
      .mockResolvedValueOnce({ alerted: false, observedPercent: 0 });

    await expect(scheduler.evaluateAll()).resolves.toBeUndefined();

    expect(evaluateMock).toHaveBeenCalledTimes(2);
  });

  it('disables itself on a database authentication failure', async () => {
    findManyMock.mockRejectedValueOnce(
      new Error('authentication failed against the database server'),
    );

    await scheduler.evaluateAll();
    await scheduler.evaluateAll();

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(evaluateMock).not.toHaveBeenCalled();
  });
});
