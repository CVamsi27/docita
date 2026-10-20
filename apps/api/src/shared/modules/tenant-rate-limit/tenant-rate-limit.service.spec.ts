import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { Cache } from 'cache-manager';
import { TenantRateLimitService } from './tenant-rate-limit.service';
import { TenantRateLimitRepository } from './tenant-rate-limit.repository';
import type { TenantQuota } from './tenant-rate-limit.types';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { IClock } from '@/shared/common/ports/clock.port';
import { COUNTER_BURST_KEY_PREFIX } from './tenant-rate-limit.constants';

const buildClock = (): IClock => ({
  now: () => new Date(),
});

function buildMemoryCache(): Cache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    get: async (key: string) => {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set: async (key: string, value: unknown, ttlMs?: number) => {
      store.set(key, {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : 0,
      });
    },
    del: async (key: string) => {
      store.delete(key);
    },
    reset: async () => {
      store.clear();
    },
  } as unknown as Cache;
}

const buildConfig = (
  overrides: Partial<{ rps: number; rpm: number; monthlyBudget: number }> = {},
): AppConfigService =>
  ({
    getTenantRateLimitDefaults: () => ({
      rps: 5,
      rpm: 50,
      monthlyBudget: 1_000,
      ...overrides,
    }),
  }) as unknown as AppConfigService;

const buildRepo = (
  quota?: Partial<TenantQuota>,
): {
  repo: TenantRateLimitRepository;
  findQuota: jest.Mock;
  upsertQuota: jest.Mock;
  incrementMonthlyUsage: jest.Mock;
} => {
  const findQuota = jest.fn(async () =>
    quota
      ? ({
          rps: 5,
          rpm: 50,
          monthlyBudget: 1_000,
          currentMonthUsed: 0,
          currentMonthResetsAt: new Date(Date.now() + 86_400_000),
          ...quota,
        } satisfies TenantQuota)
      : null,
  );
  const upsertQuota = jest.fn();
  const incrementMonthlyUsage = jest.fn(async () => null);
  return {
    repo: {
      findQuota,
      upsertQuota,
      incrementMonthlyUsage,
    } as unknown as TenantRateLimitRepository,
    findQuota,
    upsertQuota,
    incrementMonthlyUsage,
  };
};

describe('TenantRateLimitService', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = buildMemoryCache();
  });

  it('uses defaults when no override exists', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig(),
      buildClock(),
    );
    const quota = await service.getQuota('clinic-1');
    expect(quota.rps).toBe(5);
    expect(quota.rpm).toBe(50);
    expect(quota.hasOverride).toBe(false);
  });

  it('resolves persisted overrides ahead of defaults', async () => {
    const { repo } = buildRepo({ rps: 200, rpm: 10_000, monthlyBudget: 1e6 });
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig(),
      buildClock(),
    );
    const quota = await service.getQuota('clinic-1');
    expect(quota.rps).toBe(200);
    expect(quota.rpm).toBe(10_000);
    expect(quota.hasOverride).toBe(true);
  });

  it('rejects requests once burst limit is exceeded', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 2 }),
      buildClock(),
    );
    const a = await service.checkAndConsume('clinic-1');
    const b = await service.checkAndConsume('clinic-1');
    const c = await service.checkAndConsume('clinic-1');
    expect(a.find((d) => d.reason === 'burst')?.allowed).toBe(true);
    expect(b.find((d) => d.reason === 'burst')?.allowed).toBe(true);
    expect(c.find((d) => d.reason === 'burst')?.allowed).toBe(false);
  });

  it('returns the blocking decision and stops further window checks', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 1, rpm: 100 }),
      buildClock(),
    );
    await service.checkAndConsume('clinic-1');
    const blocked = await service.checkAndConsume('clinic-1');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].allowed).toBe(false);
    expect(blocked[0].reason).toBe('burst');
  });

  it('rejects when sustained limit is exceeded', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 100, rpm: 2 }),
      buildClock(),
    );
    await service.checkAndConsume('clinic-1');
    await service.checkAndConsume('clinic-1');
    const blocked = await service.checkAndConsume('clinic-1');
    expect(blocked.find((d) => d.reason === 'sustained')?.allowed).toBe(false);
  });

  it('rejects when monthly budget is exceeded', async () => {
    const { repo } = buildRepo({
      monthlyBudget: 2,
      currentMonthUsed: 0,
    });
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 100, rpm: 100 }),
      buildClock(),
    );
    await service.checkAndConsume('clinic-1');
    await service.checkAndConsume('clinic-1');
    const blocked = await service.checkAndConsume('clinic-1');
    expect(blocked.find((d) => d.reason === 'monthly')?.allowed).toBe(false);
  });

  // U01: the counters are a read-modify-write over a cache store with no atomic
  // increment, so without serialization N concurrent callers all read the same
  // count and all write count+1 — letting `limit + N - 1` requests through the
  // window. The last unit has to have exactly one winner.
  it('admits exactly one caller when parallel requests contend for the last unit', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 10, rpm: 100 }),
      buildClock(),
    );

    const decisions = await Promise.all(
      Array.from({ length: 25 }, () => service.checkAndConsume('clinic-1')),
    );
    const burstAllowed = decisions.filter(
      (d) => d.find((x) => x.reason === 'burst')?.allowed,
    );

    // The window limit is 10, so exactly 10 of 25 concurrent callers get in.
    expect(burstAllowed).toHaveLength(10);
  });

  it('does not let a rejected caller inflate the counter for the next window', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 3, rpm: 100 }),
      buildClock(),
    );

    await Promise.all(
      Array.from({ length: 12 }, () => service.checkAndConsume('clinic-1')),
    );

    const burst = await cache.get(`${COUNTER_BURST_KEY_PREFIX}clinic-1`);
    expect((burst as { count: number }).count).toBe(12);
  });

  it('rejects the monthly budget under concurrency with one winner', async () => {
    const { repo } = buildRepo({ monthlyBudget: 3, currentMonthUsed: 0 });
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 100, rpm: 100 }),
      buildClock(),
    );

    const decisions = await Promise.all(
      Array.from({ length: 15 }, () => service.checkAndConsume('clinic-1')),
    );
    const monthlyAllowed = decisions.filter(
      (d) => d.find((x) => x.reason === 'monthly')?.allowed,
    );

    expect(monthlyAllowed).toHaveLength(3);
  });

  it('keeps counters independent per clinic', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 2, rpm: 100 }),
      buildClock(),
    );

    await Promise.all([
      service.checkAndConsume('clinic-1'),
      service.checkAndConsume('clinic-1'),
      service.checkAndConsume('clinic-2'),
      service.checkAndConsume('clinic-2'),
    ]);

    const blocked = await service.checkAndConsume('clinic-1');
    const other = await service.checkAndConsume('clinic-2');

    expect(blocked[0].allowed).toBe(false);
    expect(other[0].allowed).toBe(false);
  });

  it('does not skip a queued caller when the in-flight update fails', async () => {
    const { repo } = buildRepo();
    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig({ rps: 5, rpm: 100 }),
      buildClock(),
    );

    // A failure must not poison the chain for a caller that is already queued
    // behind it. The poisoning is only observable while another caller is
    // waiting: once the lock is released, a fresh caller starts a fresh chain.
    const originalGet = cache.get.bind(cache);
    let releaseFirst!: () => void;
    const firstGetGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let first = true;
    (cache as { get: unknown }).get = (async (key: string) => {
      if (first && key.startsWith(COUNTER_BURST_KEY_PREFIX)) {
        first = false;
        await firstGetGate;
        throw new Error('cache unavailable');
      }
      return originalGet(key);
    }) as typeof cache.get;

    const inFlight = service.checkAndConsume('clinic-1');
    // Let the first caller reach the gated cache read before queueing behind it.
    await new Promise((resolve) => setImmediate(resolve));
    const queued = service.checkAndConsume('clinic-1');

    releaseFirst();

    await expect(inFlight).rejects.toThrow('cache unavailable');
    // The queued caller must still be evaluated, not silently skipped.
    const afterQueued = await queued;
    expect(afterQueued[0].allowed).toBe(true);
  });

  it('upsertQuota writes through and invalidates the cache', async () => {
    let stored: TenantQuota | null = null;
    const repo: TenantRateLimitRepository = {
      findQuota: jest.fn(async () => stored) as unknown as never,
      upsertQuota: jest.fn(
        async (
          _clinicId: string,
          input: {
            rps: number;
            rpm: number;
            monthlyBudget: number;
            notes?: string;
          },
        ) => {
          stored = {
            rps: input.rps,
            rpm: input.rpm,
            monthlyBudget: input.monthlyBudget,
            currentMonthUsed: 0,
            currentMonthResetsAt: new Date(Date.now() + 86_400_000),
          };
          return stored;
        },
      ) as unknown as never,
      incrementMonthlyUsage: jest.fn(async () => null) as unknown as never,
    } as unknown as TenantRateLimitRepository;

    const service = new TenantRateLimitService(
      cache,
      repo,
      buildConfig(),
      buildClock(),
    );
    const before = await service.getQuota('clinic-1');
    expect(before.rps).toBe(5);
    expect(before.hasOverride).toBe(false);

    await service.upsertQuota('clinic-1', {
      rps: 200,
      rpm: 10_000,
      monthlyBudget: 1_000_000,
    });

    const after = await service.getQuota('clinic-1');
    expect(after.rps).toBe(200);
    expect(after.hasOverride).toBe(true);
  });
});
