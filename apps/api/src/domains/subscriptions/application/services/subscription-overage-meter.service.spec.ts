import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicTier, UsageType } from '@workspace/db';
import { SubscriptionOverageMeterService } from './subscription-overage-meter.service';
import type { SubscriptionPersistencePort } from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import type {
  IOverageCalculation,
  OverageChargeResult,
} from '@/domains/billing/application/ports';
import { OverageInvoiceComposer } from '@/domains/subscriptions/infrastructure/schedulers/overage-invoice.composer';
import type { SubscriptionOveragePaymentService } from './subscription-overage-payment.service';

type UsageRecordUpsertArgs = Parameters<
  SubscriptionPersistencePort['usageRecord']['upsert']
>[0];

const periodStart = new Date('2026-09-01T00:00:00.000Z');
const periodEnd = new Date('2026-09-30T23:59:59.999Z');

const sub = {
  id: 'sub-1',
  clinicId: 'clinic-1',
  plan: ClinicTier.ESSENTIAL,
  currency: 'INR',
  includedAppointments: 100,
  includedUsers: 5,
};

/**
 * U01 — overage metering must be rerunnable.
 *
 * The meter is invoked by a monthly scheduler and by manual reruns after a
 * partial failure. The acceptance clause "repeated accounting preserves
 * totals" means a second run over the same period must (a) rewrite absolute
 * period values under the same composite key instead of accumulating, (b)
 * funnel money through the create-or-update invoice path exactly once per
 * run, and (c) leave no half-written meter rows when one write fails.
 */
describe('SubscriptionOverageMeterService', () => {
  let appointmentCount: jest.Mock<(args: unknown) => Promise<number>>;
  let userCount: jest.Mock<() => Promise<number>>;
  let usageEventAggregate: jest.Mock<
    (args: unknown) => Promise<{ _sum: { quantity: number | null } }>
  >;
  let usageRecordUpsert: jest.Mock<
    (args: UsageRecordUpsertArgs) => Promise<unknown>
  >;
  let persistence: SubscriptionPersistencePort;
  let calculateOverageCharges: jest.Mock<
    (clinicId: string, usageData: unknown) => Promise<OverageChargeResult>
  >;
  let createOrUpdateOverageInvoicePayment: jest.Mock<
    (params: unknown) => Promise<void>
  >;
  let service: SubscriptionOverageMeterService;

  function chargeResult(
    overrides: Partial<OverageChargeResult> = {},
  ): OverageChargeResult {
    return {
      period: { start: periodStart, end: periodEnd },
      totalOverageCharges: 600,
      currency: 'INR',
      breakdown: {
        consultations: {
          quantity: 50,
          rate: 10,
          charge: 500,
          chargeCents: 50000,
        },
        users: { quantity: 2, rate: 50, charge: 100, chargeCents: 10000 },
        whatsappMessages: {
          quantity: 0,
          rate: 0.5,
          charge: 0,
          chargeCents: 0,
        },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    appointmentCount = jest
      .fn<(args: unknown) => Promise<number>>()
      .mockResolvedValue(150);
    userCount = jest.fn<() => Promise<number>>().mockResolvedValue(7);
    usageEventAggregate = jest
      .fn<(args: unknown) => Promise<{ _sum: { quantity: number | null } }>>()
      .mockResolvedValue({ _sum: { quantity: 400 } });
    usageRecordUpsert = jest
      .fn<(args: UsageRecordUpsertArgs) => Promise<unknown>>()
      .mockResolvedValue(undefined);

    persistence = {
      appointment: { count: appointmentCount },
      user: { count: userCount },
      usageEvent: { aggregate: usageEventAggregate },
      usageRecord: { upsert: usageRecordUpsert },
    } as unknown as SubscriptionPersistencePort;

    calculateOverageCharges = jest
      .fn<
        (clinicId: string, usageData: unknown) => Promise<OverageChargeResult>
      >()
      .mockResolvedValue(chargeResult());

    createOrUpdateOverageInvoicePayment = jest
      .fn<(params: unknown) => Promise<void>>()
      .mockResolvedValue(undefined);

    service = new SubscriptionOverageMeterService(
      persistence,
      { calculateOverageCharges },
      new OverageInvoiceComposer(),
      {
        createOrUpdateOverageInvoicePayment,
      } as unknown as SubscriptionOveragePaymentService,
    );
  });

  it('meters the requested period against live counts, not cached rows', async () => {
    await service.processSubscriptionOverage(sub, periodStart, periodEnd);

    expect(appointmentCount).toHaveBeenCalledWith({
      where: {
        clinicId: 'clinic-1',
        status: 'COMPLETED',
        updatedAt: { gte: periodStart, lte: periodEnd },
      },
    });
    expect(usageEventAggregate).toHaveBeenCalledWith({
      where: {
        clinicId: 'clinic-1',
        type: UsageType.WHATSAPP_MESSAGES,
        timestamp: { gte: periodStart, lte: periodEnd },
      },
      _sum: { quantity: true },
    });
  });

  it('rerun writes the same absolute totals under the same composite key', async () => {
    await service.processSubscriptionOverage(sub, periodStart, periodEnd);
    await service.processSubscriptionOverage(sub, periodStart, periodEnd);

    // Two positive-charge meters per run: consultations and users.
    expect(usageRecordUpsert).toHaveBeenCalledTimes(4);

    const keys = usageRecordUpsert.mock.calls.map(
      ([args]) => args.where.clinicId_type_periodStart,
    );
    const uniqueKeys = new Set(keys.map((key) => JSON.stringify(key)));
    expect(uniqueKeys.size).toBe(2);
    for (const key of keys) {
      expect(key).toEqual({
        clinicId: 'clinic-1',
        type: expect.anything(),
        periodStart,
      });
    }

    // Absolute rewrite: run two echoes run one per key — quantities are
    // period totals (150 consultations, 7 users), never doubled to 300/14.
    const firstRun = usageRecordUpsert.mock.calls.slice(0, 2);
    const secondRun = usageRecordUpsert.mock.calls.slice(2, 4);
    for (let i = 0; i < firstRun.length; i++) {
      expect(secondRun[i][0].where).toEqual(firstRun[i][0].where);
      expect(secondRun[i][0].update).toEqual(firstRun[i][0].update);
      expect(secondRun[i][0].create).toEqual(firstRun[i][0].create);
    }
    const quantities = firstRun.map(([args]) => args.update.quantity);
    expect(quantities).toEqual([150, 7]);
  });

  it('funnels each run through the create-or-update invoice path once', async () => {
    await service.processSubscriptionOverage(sub, periodStart, periodEnd);
    await service.processSubscriptionOverage(sub, periodStart, periodEnd);

    expect(createOrUpdateOverageInvoicePayment).toHaveBeenCalledTimes(2);
    const [first, second] = createOrUpdateOverageInvoicePayment.mock.calls.map(
      ([params]) => params,
    );
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      clinicId: 'clinic-1',
      subscriptionId: 'sub-1',
      periodStart,
      periodEnd,
      totalOverageCharges: 600,
      currency: 'INR',
    });
  });

  it('writes no meter rows and raises no invoice when nothing is over quota', async () => {
    calculateOverageCharges.mockResolvedValue(
      chargeResult({
        totalOverageCharges: 0,
        breakdown: {
          consultations: { quantity: 0, rate: 10, charge: 0, chargeCents: 0 },
          users: { quantity: 0, rate: 50, charge: 0, chargeCents: 0 },
          whatsappMessages: {
            quantity: 0,
            rate: 0.5,
            charge: 0,
            chargeCents: 0,
          },
        },
      }),
    );

    await service.processSubscriptionOverage(sub, periodStart, periodEnd);

    expect(usageRecordUpsert).not.toHaveBeenCalled();
    expect(createOrUpdateOverageInvoicePayment).not.toHaveBeenCalled();
  });

  it('records only meters with a positive charge', async () => {
    await service.processSubscriptionOverage(sub, periodStart, periodEnd);

    const types = usageRecordUpsert.mock.calls.map(
      ([args]) => args.where.clinicId_type_periodStart?.type,
    );
    expect(types).toEqual([UsageType.APPOINTMENTS, UsageType.USERS]);
    expect(usageRecordUpsert).toHaveBeenCalledTimes(2);
  });

  it('still invoices the period when one meter row fails to write', async () => {
    usageRecordUpsert
      .mockRejectedValueOnce(new Error('write conflict'))
      .mockResolvedValueOnce(undefined);

    await expect(
      service.processSubscriptionOverage(sub, periodStart, periodEnd),
    ).resolves.toBeUndefined();

    expect(usageRecordUpsert).toHaveBeenCalledTimes(2);
    expect(createOrUpdateOverageInvoicePayment).toHaveBeenCalledTimes(1);
  });

  it('throws nothing upward when every meter row fails to write', async () => {
    usageRecordUpsert.mockRejectedValue(new Error('db down'));

    await expect(
      service.processSubscriptionOverage(sub, periodStart, periodEnd),
    ).resolves.toBeUndefined();

    expect(createOrUpdateOverageInvoicePayment).toHaveBeenCalledTimes(1);
  });
});
