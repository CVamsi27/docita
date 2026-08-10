import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { GLOBAL_BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';
import { UsageAggregationService } from './usage-aggregation.service';

type ClinicRow = { id: string };
type SubscriptionRow = { plan: string | null };
type AddOnRow = {
  addOnType: string;
  addOn: { includedQuotaByTier: unknown };
};
type UsageAggregateRow = { _sum: { quantity: number | null } };

// Calendar-window semantics (KNOWN PRODUCT-DECISION ITEM — do not change):
// the service derives the aggregation window and the usage-month bounds with
// LOCAL-TIME Date math (`setDate(-1)` + `setHours(0,0,0,0)` on the injected
// clock result, and `new Date(y, m, ...)` month constructors). On the
// production worker (UTC) this yields a UTC-midnight window; clinics operate
// on IST. Whether the billing window should be IST-based (Asia/Kolkata) is an
// open product decision — this spec PINS the current behavior and does not
// "fix" it.
//
// Assertions therefore pin date COMPONENTS (yesterday's calendar day, the
// usage month's 1st..last) rather than exact UTC instants, which would vary
// with the machine/worker timezone. The noon-UTC clock keeps the
// calendar-day assertions valid for any timezone <= UTC+11; on
// UTC+12..+14 machines (NZ/Fiji/Samoa/Kiritimati) yesterday would land a
// day later and these assertions would need to shift.
describe('UsageAggregationService (main: Prisma-backed)', () => {
  const runUnrestrictedMock =
    jest.fn<(cb: () => Promise<unknown>) => Promise<unknown>>();
  const clinicFindManyMock =
    jest.fn<(args?: unknown) => Promise<ClinicRow[]>>();
  const subscriptionFindUniqueMock =
    jest.fn<(args?: unknown) => Promise<SubscriptionRow | null>>();
  const addOnFindManyMock = jest.fn<(args?: unknown) => Promise<AddOnRow[]>>();
  const usageEventAggregateMock =
    jest.fn<(args?: unknown) => Promise<UsageAggregateRow>>();
  const usageRecordUpsertMock = jest.fn<(args?: unknown) => Promise<unknown>>();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    runUnrestricted: {
      value: runUnrestrictedMock.mockImplementation(
        async (cb: () => Promise<unknown>) => cb(),
      ),
      writable: true,
    },
    clinic: {
      value: { findMany: clinicFindManyMock },
      writable: true,
    },
    subscription: {
      value: { findUnique: subscriptionFindUniqueMock },
      writable: true,
    },
    clinicAddOn: {
      value: { findMany: addOnFindManyMock },
      writable: true,
    },
    usageEvent: {
      value: { aggregate: usageEventAggregateMock },
      writable: true,
    },
    usageRecord: {
      value: { upsert: usageRecordUpsertMock },
      writable: true,
    },
  });

  // Fresh Date per call: runDailyUsageAggregation mutates the clock result
  // via setDate/setHours, so a shared instance would corrupt later reads.
  const clock = { now: () => new Date('2026-06-12T12:00:00.000Z') };
  const service = new UsageAggregationService(prisma, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    runUnrestrictedMock.mockImplementation(async (cb: () => Promise<unknown>) =>
      cb(),
    );
    clinicFindManyMock.mockResolvedValue([]);
    subscriptionFindUniqueMock.mockResolvedValue({ plan: 'PROFESSIONAL' });
    addOnFindManyMock.mockResolvedValue([]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 0 } });
    usageRecordUpsertMock.mockResolvedValue(undefined);
  });

  it('does nothing when no active-subscription clinics exist', async () => {
    await service.runDailyUsageAggregation();

    expect(runUnrestrictedMock).toHaveBeenCalledTimes(1);
    expect(usageEventAggregateMock).not.toHaveBeenCalled();
    expect(usageRecordUpsertMock).not.toHaveBeenCalled();
  });

  it('selects only ACTIVE/TRIALING clinics with the bulk-read cap', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    subscriptionFindUniqueMock.mockResolvedValue(null);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 0 } });

    await service.runDailyUsageAggregation();

    expect(clinicFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          subscription: { status: { in: ['ACTIVE', 'TRIALING'] } },
        },
        select: { id: true },
        take: GLOBAL_BULK_READ_LIMIT,
      }),
    );
  });

  it('aggregates both usage types per clinic with add-on quotas applied', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    addOnFindManyMock.mockResolvedValue([
      {
        addOnType: 'WHATSAPP',
        addOn: { includedQuotaByTier: { PROFESSIONAL: 500, CORE: 100 } },
      },
      {
        addOnType: 'INTELLIGENCE',
        addOn: { includedQuotaByTier: { PROFESSIONAL: 200 } },
      },
    ]);
    usageEventAggregateMock.mockImplementation(
      async (args?: unknown): Promise<UsageAggregateRow> => {
        const where = (args as { where?: { type?: string } } | undefined)
          ?.where;
        return {
          _sum: {
            quantity: where?.type === 'WHATSAPP_MESSAGES' ? 1200 : 150,
          },
        };
      },
    );

    await service.runDailyUsageAggregation();

    expect(subscriptionFindUniqueMock).toHaveBeenCalledWith({
      where: { clinicId: 'clinic-1' },
      select: { plan: true },
    });
    expect(addOnFindManyMock).toHaveBeenCalledWith({
      where: { clinicId: 'clinic-1', status: 'ACTIVE' },
      include: { addOn: true },
    });
    // both usage types summed over yesterday's calendar window (June 11)
    const aggregateArgs = usageEventAggregateMock.mock.calls.map(
      (call) =>
        call[0] as {
          where: {
            clinicId: string;
            type: string;
            timestamp: { gte: Date; lte: Date };
          };
        },
    );
    expect(aggregateArgs).toHaveLength(2);
    const whatsappAgg = aggregateArgs.find(
      (a) => a.where.type === 'WHATSAPP_MESSAGES',
    );
    expect(whatsappAgg?.where.clinicId).toBe('clinic-1');
    expect(whatsappAgg?.where.timestamp.gte.getFullYear()).toBe(2026);
    expect(whatsappAgg?.where.timestamp.gte.getMonth()).toBe(5); // June
    expect(whatsappAgg?.where.timestamp.gte.getDate()).toBe(11);
    expect(whatsappAgg?.where.timestamp.gte.getHours()).toBe(0);
    expect(whatsappAgg?.where.timestamp.lte.getDate()).toBe(11);
    expect(whatsappAgg?.where.timestamp.lte.getHours()).toBe(23);
    expect(whatsappAgg?.where.timestamp.lte.getMinutes()).toBe(59);
    expect(whatsappAgg?.where.timestamp.lte.getSeconds()).toBe(59);
    const aiAgg = aggregateArgs.find((a) => a.where.type === 'AI_CREDITS');
    expect(aiAgg?.where.timestamp.gte.getDate()).toBe(11);

    // records upsert into the usage day's month with quota and overage
    const upsertCalls = usageRecordUpsertMock.mock.calls.map(
      (call) =>
        call[0] as {
          where: { clinicId_type_periodStart: Record<string, unknown> };
          update: { quantity: { increment: number } };
          create: {
            clinicId: string;
            type: string;
            periodStart: Date;
            periodEnd: Date;
            quantity: number;
            includedQuota: number;
            overageUnits: number;
          };
        },
    );
    expect(upsertCalls).toHaveLength(2);
    const whatsappUpsert = upsertCalls.find(
      (u) => u.create.type === 'WHATSAPP_MESSAGES',
    );
    expect(whatsappUpsert?.create.clinicId).toBe('clinic-1');
    expect(whatsappUpsert?.create.quantity).toBe(1200);
    expect(whatsappUpsert?.create.includedQuota).toBe(500);
    expect(whatsappUpsert?.create.overageUnits).toBe(700);
    expect(whatsappUpsert?.where.clinicId_type_periodStart).toEqual(
      expect.objectContaining({
        clinicId: 'clinic-1',
        type: 'WHATSAPP_MESSAGES',
      }),
    );
    expect(whatsappUpsert?.update).toEqual({
      quantity: { increment: 1200 },
    });
    // period spans the usage month: June 1 .. June 30 23:59:59.999
    expect(whatsappUpsert?.create.periodStart.getFullYear()).toBe(2026);
    expect(whatsappUpsert?.create.periodStart.getMonth()).toBe(5);
    expect(whatsappUpsert?.create.periodStart.getDate()).toBe(1);
    expect(whatsappUpsert?.create.periodEnd.getMonth()).toBe(5);
    expect(whatsappUpsert?.create.periodEnd.getDate()).toBe(30);
    expect(whatsappUpsert?.create.periodEnd.getHours()).toBe(23);
    expect(whatsappUpsert?.create.periodEnd.getMinutes()).toBe(59);
    expect(whatsappUpsert?.create.periodEnd.getSeconds()).toBe(59);

    const aiUpsert = upsertCalls.find((u) => u.create.type === 'AI_CREDITS');
    expect(aiUpsert?.create.quantity).toBe(150);
    expect(aiUpsert?.create.includedQuota).toBe(200);
    expect(aiUpsert?.create.overageUnits).toBe(0);
  });

  it('skips the upsert for usage types with zero quantity', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 0 } });

    await service.runDailyUsageAggregation();

    expect(usageEventAggregateMock).toHaveBeenCalledTimes(2);
    expect(usageRecordUpsertMock).not.toHaveBeenCalled();
  });

  it('defaults the plan to CORE when the clinic has no subscription plan', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    subscriptionFindUniqueMock.mockResolvedValue(null);
    addOnFindManyMock.mockResolvedValue([
      { addOnType: 'WHATSAPP', addOn: { includedQuotaByTier: { CORE: 100 } } },
    ]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 50 } });

    await service.runDailyUsageAggregation();

    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'WHATSAPP_MESSAGES',
          includedQuota: 100,
          overageUnits: 0, // 50 - 100 clamps to zero
        }),
      }),
    );
  });

  it('treats an unknown tier key in the add-on quota as zero included', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    addOnFindManyMock.mockResolvedValue([
      {
        addOnType: 'WHATSAPP',
        addOn: { includedQuotaByTier: { STARTER: 100 } },
      },
    ]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 60 } });

    await service.runDailyUsageAggregation();

    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'WHATSAPP_MESSAGES',
          includedQuota: 0,
          overageUnits: 60,
        }),
      }),
    );
  });

  it('treats a null add-on quota column as zero included', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    addOnFindManyMock.mockResolvedValue([
      { addOnType: 'WHATSAPP', addOn: { includedQuotaByTier: null } },
    ]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 90 } });

    await service.runDailyUsageAggregation();

    // parsePrismaJsonColumn returns undefined for null -> ?? {} -> 0 included
    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'WHATSAPP_MESSAGES',
          includedQuota: 0,
          overageUnits: 90,
        }),
      }),
    );
  });

  it('swallows a malformed add-on quota and still records usage with zero included', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    addOnFindManyMock.mockResolvedValue([
      {
        addOnType: 'WHATSAPP',
        addOn: { includedQuotaByTier: { PROFESSIONAL: 'not-a-number' } },
      },
    ]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 75 } });

    await service.runDailyUsageAggregation();

    // the Zod parse throws, is caught, and the rollup proceeds with 0 included
    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'WHATSAPP_MESSAGES',
          includedQuota: 0,
          overageUnits: 75,
        }),
      }),
    );
  });

  it('records full overage when no matching add-on exists', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 40 } });

    await service.runDailyUsageAggregation();

    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'WHATSAPP_MESSAGES',
          includedQuota: 0,
          overageUnits: 40,
        }),
      }),
    );
    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'AI_CREDITS',
          includedQuota: 0,
          overageUnits: 40,
        }),
      }),
    );
  });

  it('aggregates across all active clinics in parallel', async () => {
    clinicFindManyMock.mockResolvedValue([
      { id: 'clinic-1' },
      { id: 'clinic-2' },
    ]);
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 5 } });

    await service.runDailyUsageAggregation();

    expect(usageRecordUpsertMock).toHaveBeenCalledTimes(4); // 2 clinics x 2 types
    const upsertCalls = usageRecordUpsertMock.mock.calls.map(
      (call) =>
        (call[0] as { create: { clinicId: string; periodStart: Date } }).create,
    );
    expect(upsertCalls.filter((c) => c.clinicId === 'clinic-2')).toHaveLength(
      2,
    );
    // each record lands in the usage day's month (June)
    expect(upsertCalls[0]?.periodStart.getMonth()).toBe(5);
  });

  it('isolates a failing clinic so the remaining clinics still aggregate', async () => {
    clinicFindManyMock.mockResolvedValue([
      { id: 'clinic-1' },
      { id: 'clinic-2' },
    ]);
    subscriptionFindUniqueMock
      .mockRejectedValueOnce(new Error('plan boom'))
      .mockResolvedValueOnce({ plan: 'PROFESSIONAL' });
    usageEventAggregateMock.mockResolvedValue({ _sum: { quantity: 10 } });

    await expect(service.runDailyUsageAggregation()).resolves.toBeUndefined();

    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ clinicId: 'clinic-2' }),
      }),
    );
  });

  it('isolates a failing usage-type aggregation within a clinic', async () => {
    clinicFindManyMock.mockResolvedValue([{ id: 'clinic-1' }]);
    usageEventAggregateMock
      .mockRejectedValueOnce(new Error('sum boom')) // WHATSAPP_MESSAGES
      .mockResolvedValueOnce({ _sum: { quantity: 30 } }); // AI_CREDITS

    await expect(service.runDailyUsageAggregation()).resolves.toBeUndefined();

    expect(usageRecordUpsertMock).toHaveBeenCalledTimes(1);
    expect(usageRecordUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: 'AI_CREDITS', quantity: 30 }),
      }),
    );
  });
});
