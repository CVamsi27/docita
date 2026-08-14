import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UsageType } from '@workspace/db';
import {
  type ActiveAddOnSnapshot,
  type IUsageRepository,
  type UpsertUsageRecordParams,
} from '@/domains/billing/core/repositories/usage.repository';
import { UsageAggregationService } from './usage-aggregation.service';

type SumCall = {
  clinicId: string;
  type: UsageType;
  start: Date;
  end: Date;
};

// KNOWN PRODUCT-DECISION ITEM (do not change behavior): the service derives
// the aggregation window with local-time Date math on the injected clock
// (setDate(-1) + setHours(0,0,0,0)) and the usage-month bounds with
// `new Date(y, m, ...)` constructors. On the production worker (UTC) this
// yields a UTC-midnight window; clinics operate on IST — whether the billing
// window should be IST-based (Asia/Kolkata) is an open product decision.
// This spec PINS the current behavior and does not "fix" it.
//
// Assertions therefore pin date COMPONENTS (yesterday's calendar day, the
// usage month's 1st..last) rather than exact UTC instants, which would vary
// with the machine/worker timezone.
// The noon-UTC clock keeps the calendar-day assertions valid for any
// timezone <= UTC+11; on UTC+12..+14 machines (NZ/Fiji/Samoa/Kiritimati)
// yesterday would land a day later and these assertions would need to shift.
describe('UsageAggregationService', () => {
  const runUnrestrictedMock =
    jest.fn<(cb: () => Promise<unknown>) => Promise<unknown>>();
  const findClinicIdsMock = jest.fn<() => Promise<string[]>>();
  const findPlanMock = jest.fn<(clinicId: string) => Promise<string | null>>();
  const findAddOnsMock =
    jest.fn<(clinicId: string) => Promise<ActiveAddOnSnapshot[]>>();
  const sumUsageMock =
    jest.fn<
      (
        clinicId: string,
        type: UsageType,
        start: Date,
        end: Date,
      ) => Promise<number>
    >();
  const upsertMock =
    jest.fn<(params: UpsertUsageRecordParams) => Promise<void>>();

  const usageRepository = {
    runUnrestricted: runUnrestrictedMock,
    findActiveSubscriptionClinicIds: findClinicIdsMock,
    findSubscriptionPlan: findPlanMock,
    findActiveAddOns: findAddOnsMock,
    sumUsage: sumUsageMock,
    upsertUsageRecord: upsertMock,
  } as unknown as IUsageRepository;

  // Fresh Date per call: runDailyUsageAggregation mutates the clock result
  // via setDate/setHours, so a shared instance would corrupt later reads.
  const clock = { now: () => new Date('2026-06-12T12:00:00.000Z') };
  const service = new UsageAggregationService(usageRepository, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    runUnrestrictedMock.mockImplementation(async (cb: () => Promise<unknown>) =>
      cb(),
    );
    findClinicIdsMock.mockResolvedValue([]);
    findPlanMock.mockResolvedValue('PROFESSIONAL');
    findAddOnsMock.mockResolvedValue([]);
    sumUsageMock.mockResolvedValue(0);
    upsertMock.mockResolvedValue(undefined);
  });

  it('does nothing when no active-subscription clinics exist', async () => {
    await service.runDailyUsageAggregation();

    expect(runUnrestrictedMock).toHaveBeenCalledTimes(1);
    expect(sumUsageMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('aggregates both usage types per clinic with add-on quotas applied', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    findAddOnsMock.mockResolvedValue([
      {
        addOnType: 'WHATSAPP',
        addOn: { includedQuotaByTier: { PROFESSIONAL: 500, CORE: 100 } },
      },
      {
        addOnType: 'INTELLIGENCE',
        addOn: { includedQuotaByTier: { PROFESSIONAL: 200 } },
      },
    ]);
    const sumCalls: SumCall[] = [];
    sumUsageMock.mockImplementation(async (clinicId, type, start, end) => {
      sumCalls.push({ clinicId, type, start, end });
      return type === 'WHATSAPP_MESSAGES' ? 1200 : 150;
    });
    const upsertCalls: UpsertUsageRecordParams[] = [];
    upsertMock.mockImplementation(async (params) => {
      upsertCalls.push(params);
    });

    await service.runDailyUsageAggregation();

    expect(findClinicIdsMock).toHaveBeenCalledTimes(1);
    expect(findPlanMock).toHaveBeenCalledWith('clinic-1');
    expect(findAddOnsMock).toHaveBeenCalledWith('clinic-1');
    expect(sumCalls).toHaveLength(2);

    // usage is summed over yesterday's calendar window (June 11)
    const whatsappSum = sumCalls.find((c) => c.type === 'WHATSAPP_MESSAGES');
    expect(whatsappSum?.clinicId).toBe('clinic-1');
    expect(whatsappSum?.start.getFullYear()).toBe(2026);
    expect(whatsappSum?.start.getMonth()).toBe(5); // June
    expect(whatsappSum?.start.getDate()).toBe(11);
    expect(whatsappSum?.start.getHours()).toBe(0);
    expect(whatsappSum?.end.getDate()).toBe(11);
    expect(whatsappSum?.end.getHours()).toBe(23);
    expect(whatsappSum?.end.getMinutes()).toBe(59);
    expect(whatsappSum?.end.getSeconds()).toBe(59);
    const aiSum = sumCalls.find((c) => c.type === 'AI_CREDITS');
    expect(aiSum?.start.getDate()).toBe(11);

    // records upsert into the usage day's month with quota and overage
    const whatsappUpsert = upsertCalls.find(
      (p) => p.type === 'WHATSAPP_MESSAGES',
    );
    expect(whatsappUpsert).toBeDefined();
    expect(whatsappUpsert?.clinicId).toBe('clinic-1');
    expect(whatsappUpsert?.quantity).toBe(1200);
    expect(whatsappUpsert?.includedQuota).toBe(500);
    expect(whatsappUpsert?.overageUnits).toBe(700);
    // period spans the usage month: June 1 .. June 30 23:59:59.999
    expect(whatsappUpsert?.periodStart.getFullYear()).toBe(2026);
    expect(whatsappUpsert?.periodStart.getMonth()).toBe(5);
    expect(whatsappUpsert?.periodStart.getDate()).toBe(1);
    expect(whatsappUpsert?.periodEnd.getMonth()).toBe(5);
    expect(whatsappUpsert?.periodEnd.getDate()).toBe(30);
    expect(whatsappUpsert?.periodEnd.getHours()).toBe(23);
    expect(whatsappUpsert?.periodEnd.getMinutes()).toBe(59);
    expect(whatsappUpsert?.periodEnd.getSeconds()).toBe(59);

    const aiUpsert = upsertCalls.find((p) => p.type === 'AI_CREDITS');
    expect(aiUpsert?.quantity).toBe(150);
    expect(aiUpsert?.includedQuota).toBe(200);
    expect(aiUpsert?.overageUnits).toBe(0);
  });

  it('skips the upsert for usage types with zero quantity', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    sumUsageMock.mockResolvedValue(0);

    await service.runDailyUsageAggregation();

    expect(sumUsageMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('defaults the plan to CORE when the clinic has no subscription plan', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    findPlanMock.mockResolvedValue(null);
    findAddOnsMock.mockResolvedValue([
      { addOnType: 'WHATSAPP', addOn: { includedQuotaByTier: { CORE: 100 } } },
    ]);
    sumUsageMock.mockResolvedValue(50);

    await service.runDailyUsageAggregation();

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WHATSAPP_MESSAGES',
        includedQuota: 100,
        overageUnits: 0, // 50 - 100 clamps to zero
      }),
    );
  });

  it('treats an unknown tier key in the add-on quota as zero included', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    findPlanMock.mockResolvedValue('PROFESSIONAL');
    findAddOnsMock.mockResolvedValue([
      {
        addOnType: 'WHATSAPP',
        addOn: { includedQuotaByTier: { STARTER: 100 } },
      },
    ]);
    sumUsageMock.mockResolvedValue(60);

    await service.runDailyUsageAggregation();

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WHATSAPP_MESSAGES',
        includedQuota: 0,
        overageUnits: 60,
      }),
    );
  });

  it('treats a null add-on quota column as zero included', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    findAddOnsMock.mockResolvedValue([
      { addOnType: 'WHATSAPP', addOn: { includedQuotaByTier: null } },
    ]);
    sumUsageMock.mockResolvedValue(90);

    await service.runDailyUsageAggregation();

    // parsePrismaJsonColumn returns undefined for null -> ?? {} -> 0 included
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WHATSAPP_MESSAGES',
        includedQuota: 0,
        overageUnits: 90,
      }),
    );
  });

  it('swallows a malformed add-on quota and still records usage with zero included', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    findAddOnsMock.mockResolvedValue([
      {
        addOnType: 'WHATSAPP',
        addOn: { includedQuotaByTier: { PROFESSIONAL: 'not-a-number' } },
      },
    ]);
    sumUsageMock.mockResolvedValue(75);

    await service.runDailyUsageAggregation();

    // the Zod parse throws, is caught, and the rollup proceeds with 0 included
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WHATSAPP_MESSAGES',
        includedQuota: 0,
        overageUnits: 75,
      }),
    );
  });

  it('records full overage when no matching add-on exists', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    sumUsageMock.mockResolvedValue(40);

    await service.runDailyUsageAggregation();

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WHATSAPP_MESSAGES',
        includedQuota: 0,
        overageUnits: 40,
      }),
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'AI_CREDITS',
        includedQuota: 0,
        overageUnits: 40,
      }),
    );
  });

  it('aggregates across all active clinics in parallel', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1', 'clinic-2']);
    sumUsageMock.mockResolvedValue(5);
    const upsertCalls: UpsertUsageRecordParams[] = [];
    upsertMock.mockImplementation(async (params) => {
      upsertCalls.push(params);
    });

    await service.runDailyUsageAggregation();

    expect(upsertCalls).toHaveLength(4); // 2 clinics x 2 usage types
    expect(upsertCalls.filter((p) => p.clinicId === 'clinic-2')).toHaveLength(
      2,
    );
    // each record lands in the usage day's month (June)
    expect(upsertCalls[0]?.periodStart.getMonth()).toBe(5);
  });

  it('isolates a failing clinic so the remaining clinics still aggregate', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1', 'clinic-2']);
    findPlanMock
      .mockRejectedValueOnce(new Error('plan boom'))
      .mockResolvedValueOnce('PROFESSIONAL');
    sumUsageMock.mockResolvedValue(10);

    await expect(service.runDailyUsageAggregation()).resolves.toBeUndefined();

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ clinicId: 'clinic-2' }),
    );
  });

  it('isolates a failing usage-type aggregation within a clinic', async () => {
    findClinicIdsMock.mockResolvedValue(['clinic-1']);
    sumUsageMock
      .mockRejectedValueOnce(new Error('sum boom')) // WHATSAPP_MESSAGES
      .mockResolvedValueOnce(30); // AI_CREDITS

    await expect(service.runDailyUsageAggregation()).resolves.toBeUndefined();

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AI_CREDITS', quantity: 30 }),
    );
  });
});
