import {
  EnterpriseContractStatus,
  TrueUpAlertDeliveryStatus,
} from '@workspace/db';
import type { EnterpriseContractPersistencePort } from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import { EnterpriseContractTrueUpCommandService } from './enterprise-contract-true-up-command.service';
import type { EmailService } from '@/shared/modules/messaging/email/email.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const ACTIVE_CONTRACT = {
  id: 'contract-1',
  primaryClinicId: 'clinic-1',
  contractNumber: 'ENT-001',
  status: EnterpriseContractStatus.ACTIVE,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2026-12-31T00:00:00.000Z'),
  platformFeeCents: 100_000_00,
  trueUpThresholdPercent: 130,
  currency: 'INR',
};

function createService(opts: {
  contract: typeof ACTIVE_CONTRACT | null;
  members?: Array<{ clinicId: string; removedAt: null | Date }>;
  ytdOverageCents?: number;
  alreadyAlerted?: boolean;
  recipients?: string[];
  now?: Date;
  sendResult?: { success: boolean; error?: string };
}) {
  const enterpriseTrueUpAlertCreate = jest.fn(async () => ({
    id: 'alert-1',
  }));
  const enterpriseTrueUpAlertUpdate = jest.fn(
    async (_args: { data: { deliveryStatus: string } }) => ({}),
  );
  const enterpriseContractUpdate = jest.fn(async () => ({}));
  const usageRecordAggregate = jest.fn(async () => ({
    _sum: { overageChargeCents: opts.ytdOverageCents ?? 0 },
  }));
  const enterpriseContractMemberFindMany = jest.fn(
    async () => opts.members ?? [{ clinicId: 'clinic-1', removedAt: null }],
  );
  const enterpriseTrueUpAlertFindFirst = jest.fn(async () =>
    opts.alreadyAlerted ? { id: 'alert-prev' } : null,
  );
  const enterpriseContractFindUnique = jest.fn(async () => opts.contract);
  const runUnrestricted = jest.fn(
    async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  );

  const persistence = {
    runUnrestricted,
    enterpriseContract: {
      findUnique: enterpriseContractFindUnique,
      update: enterpriseContractUpdate,
    },
    enterpriseContractMember: {
      findMany: enterpriseContractMemberFindMany,
    },
    enterpriseTrueUpAlert: {
      create: enterpriseTrueUpAlertCreate,
      update: enterpriseTrueUpAlertUpdate,
      findFirst: enterpriseTrueUpAlertFindFirst,
    },
    usageRecord: {
      aggregate: usageRecordAggregate,
    },
  } as unknown as EnterpriseContractPersistencePort;

  const send = jest.fn(
    async (_opts: unknown) => opts.sendResult ?? { success: true },
  );
  const emailService = { send } as unknown as EmailService;
  const configService = {
    getInternalAllowedEmails: () => opts.recipients ?? [],
  } as unknown as ConstructorParameters<
    typeof EnterpriseContractTrueUpCommandService
  >[2];
  const clock = {
    now: () => opts.now ?? new Date('2026-06-15T00:00:00.000Z'),
  } satisfies IClock;

  const service = new EnterpriseContractTrueUpCommandService(
    persistence,
    emailService,
    configService,
    clock,
  );

  return {
    service,
    persistence,
    send,
    enterpriseTrueUpAlertCreate,
    enterpriseTrueUpAlertUpdate,
    enterpriseContractUpdate,
    enterpriseContractMemberFindMany,
    usageRecordAggregate,
    enterpriseTrueUpAlertFindFirst,
  };
}

describe('EnterpriseContractTrueUpCommandService', () => {
  it('returns no-alert when contract is missing', async () => {
    const ctx = createService({ contract: null });
    const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');
    expect(result).toEqual({ alerted: false, observedPercent: 0 });
    expect(ctx.enterpriseTrueUpAlertCreate).not.toHaveBeenCalled();
    expect(ctx.send).not.toHaveBeenCalled();
  });

  it('returns no-alert when contract is not ACTIVE', async () => {
    const ctx = createService({
      contract: {
        ...ACTIVE_CONTRACT,
        status: EnterpriseContractStatus.TERMINATED,
      } as unknown as typeof ACTIVE_CONTRACT,
    });
    const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');
    expect(result).toEqual({ alerted: false, observedPercent: 0 });
    expect(ctx.enterpriseTrueUpAlertCreate).not.toHaveBeenCalled();
  });

  it('skips when observed usage is below threshold', async () => {
    // 6 months * 100k = 600k platform; 0 overage => 100% (well below 130%).
    const ctx = createService({
      contract: ACTIVE_CONTRACT,
      ytdOverageCents: 0,
    });
    const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');
    expect(result.alerted).toBe(false);
    expect(result.observedPercent).toBe(100);
    expect(ctx.enterpriseTrueUpAlertCreate).not.toHaveBeenCalled();
  });

  it('creates an alert + sends email when threshold is crossed', async () => {
    // 6 months * 100k = 600k platform; 200k overage => 133% (above 130%).
    const ctx = createService({
      contract: ACTIVE_CONTRACT,
      ytdOverageCents: 200_000_00,
      recipients: ['finance@docita.work'],
    });
    const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');
    expect(result.alerted).toBe(true);
    expect(result.observedPercent).toBe(133);
    expect(ctx.enterpriseTrueUpAlertCreate).toHaveBeenCalledTimes(1);
    expect(ctx.enterpriseContractUpdate).toHaveBeenCalledTimes(1);
    expect(ctx.send).toHaveBeenCalledTimes(1);
    const emailCall = ctx.send.mock.calls.at(0)?.[0] as
      | { to: string; subject: string }
      | undefined;
    expect(emailCall?.to).toBe('finance@docita.work');
    expect(emailCall?.subject).toContain('True-up alert');
    expect(emailCall?.subject).toContain('133%');
  });

  it('skips when an alert was already raised this month', async () => {
    const ctx = createService({
      contract: ACTIVE_CONTRACT,
      ytdOverageCents: 200_000_00,
      alreadyAlerted: true,
    });
    const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');
    expect(result.alerted).toBe(false);
    expect(ctx.enterpriseTrueUpAlertCreate).not.toHaveBeenCalled();
    expect(ctx.send).not.toHaveBeenCalled();
  });

  it('persists the alert + updates lastTrueUpAlertAt even with no recipients', async () => {
    const ctx = createService({
      contract: ACTIVE_CONTRACT,
      ytdOverageCents: 200_000_00,
      recipients: [],
    });
    const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');
    expect(result.alerted).toBe(true);
    expect(ctx.enterpriseTrueUpAlertCreate).toHaveBeenCalledTimes(1);
    expect(ctx.enterpriseContractUpdate).toHaveBeenCalledWith({
      where: { id: 'contract-1' },
      data: { lastTrueUpAlertAt: expect.any(Date) },
    });
    expect(ctx.send).not.toHaveBeenCalled();
  });

  it('logs a warning but does not throw when email send fails', async () => {
    const ctx = createService({
      contract: ACTIVE_CONTRACT,
      ytdOverageCents: 200_000_00,
      recipients: ['finance@docita.work'],
      sendResult: { success: false, error: 'smtp down' },
    });
    const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');
    // Alert is still recorded as raised; email failure is a soft warn.
    expect(result.alerted).toBe(true);
    expect(ctx.enterpriseTrueUpAlertCreate).toHaveBeenCalledTimes(1);
  });
  // E01 clause 3: the alert row must record what actually happened to the
  // send. Previously the row was written before the send and failures were only
  // logged, so an "alert" proved nothing about delivery.
  describe('delivery evidence', () => {
    const crossed = {
      contract: ACTIVE_CONTRACT,
      ytdOverageCents: 200_000_00,
    } as const;

    it('records DELIVERED with the accepted recipients when every send succeeds', async () => {
      const ctx = createService({
        ...crossed,
        recipients: ['finance@docita.work', 'ops@docita.work'],
        sendResult: { success: true },
      });

      await ctx.service.evaluateAndAlertTrueUp('contract-1');

      expect(ctx.enterpriseTrueUpAlertUpdate).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          deliveryStatus: TrueUpAlertDeliveryStatus.DELIVERED,
          deliveredTo: ['finance@docita.work', 'ops@docita.work'],
          deliveredAt: expect.any(Date),
          failureDetail: null,
        }),
      });
    });

    it('records FAILED and a reason when no recipient accepts', async () => {
      const ctx = createService({
        ...crossed,
        recipients: ['finance@docita.work'],
        sendResult: { success: false, error: 'smtp down' },
      });

      await ctx.service.evaluateAndAlertTrueUp('contract-1');

      expect(ctx.enterpriseTrueUpAlertUpdate).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          deliveryStatus: TrueUpAlertDeliveryStatus.FAILED,
          deliveredTo: [],
          deliveredAt: null,
          failureDetail: expect.stringContaining('smtp down'),
        }),
      });
    });

    it('records PARTIAL and only the accepted recipients on a mixed outcome', async () => {
      const send = jest
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'mailbox full' });
      const ctx = createService({
        ...crossed,
        recipients: ['finance@docita.work', 'ops@docita.work'],
      });
      (ctx.send as unknown as jest.Mock).mockImplementation(send);

      await ctx.service.evaluateAndAlertTrueUp('contract-1');

      expect(ctx.enterpriseTrueUpAlertUpdate).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          deliveryStatus: TrueUpAlertDeliveryStatus.PARTIAL,
          deliveredTo: ['finance@docita.work'],
          deliveredAt: null,
          failureDetail: expect.stringContaining('mailbox full'),
        }),
      });
    });

    it('records UNKNOWN, not DELIVERED, when the send throws', async () => {
      const ctx = createService({
        ...crossed,
        recipients: ['finance@docita.work'],
      });
      (ctx.send as unknown as jest.Mock).mockRejectedValue(
        new Error('provider exploded'),
      );

      const result = await ctx.service.evaluateAndAlertTrueUp('contract-1');

      expect(result.alerted).toBe(true);
      expect(ctx.enterpriseTrueUpAlertUpdate).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          deliveryStatus: TrueUpAlertDeliveryStatus.UNKNOWN,
          deliveredAt: null,
          failureDetail: expect.stringContaining('provider exploded'),
        }),
      });
    });

    it('never claims delivery when there were no recipients to send to', async () => {
      const ctx = createService({ ...crossed, recipients: [] });

      await ctx.service.evaluateAndAlertTrueUp('contract-1');

      // Recorded UNKNOWN at insert, and no send means no delivery update.
      expect(ctx.enterpriseTrueUpAlertCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deliveryStatus: TrueUpAlertDeliveryStatus.UNKNOWN,
            failureDetail: expect.stringContaining('No internal recipients'),
          }),
        }),
      );
      expect(ctx.enterpriseTrueUpAlertUpdate).not.toHaveBeenCalled();
      expect(ctx.send).not.toHaveBeenCalled();
    });

    it('never marks an alert DELIVERED when the provider reports failure', async () => {
      const ctx = createService({
        ...crossed,
        recipients: ['finance@docita.work'],
        sendResult: { success: false },
      });

      await ctx.service.evaluateAndAlertTrueUp('contract-1');

      const statuses = ctx.enterpriseTrueUpAlertUpdate.mock.calls.map(
        (call) => call[0].data.deliveryStatus,
      );
      expect(statuses).not.toContain(TrueUpAlertDeliveryStatus.DELIVERED);
    });
  });
});
