import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { Cache } from 'cache-manager';
import { FeatureFlagsService } from './feature-flags.service';
import {
  FeatureFlagRecord,
  FeatureFlagsRepository,
} from './feature-flags.repository';

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

const buildRecord = (
  overrides: Partial<FeatureFlagRecord> = {},
): FeatureFlagRecord => ({
  key: 'demo-flag',
  description: 'demo',
  defaultEnabled: false,
  clinicOverrides: null,
  userOverrides: null,
  percentageRollout: null,
  ...overrides,
});

const buildRepo = (
  records: FeatureFlagRecord[] = [],
): {
  repo: FeatureFlagsRepository;
  upsert: jest.Mock;
  kill: jest.Mock;
} => {
  const upsert = jest.fn(async (...args: unknown[]) => args[0]);
  const kill = jest.fn(async (...args: unknown[]) => {
    const key = args[0] as string;
    const found = records.find((r) => r.key === key);
    if (!found) return null;
    return {
      ...found,
      defaultEnabled: false,
      clinicOverrides: null,
      userOverrides: null,
      percentageRollout: null,
    };
  });
  return {
    repo: {
      findAll: async () => records,
      findByKey: async (key: string) =>
        records.find((r) => r.key === key) ?? null,
      upsert,
      kill,
    } as unknown as FeatureFlagsRepository,
    upsert,
    kill,
  };
};

describe('FeatureFlagsService', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = buildMemoryCache();
  });

  it('returns false for unknown flags', async () => {
    const { repo } = buildRepo();
    const service = new FeatureFlagsService(cache, repo, {
      emit: jest.fn(),
    } as never);
    expect(
      await service.isEnabled('missing', { userId: 'u', clinicId: 'c' }),
    ).toBe(false);
  });

  it('respects user override above clinic override and rollout', async () => {
    const record = buildRecord({
      defaultEnabled: false,
      clinicOverrides: { 'clinic-1': true },
      userOverrides: { 'user-1': false },
      percentageRollout: 100,
    });
    const { repo } = buildRepo([record]);
    const service = new FeatureFlagsService(cache, repo, {
      emit: jest.fn(),
    } as never);
    expect(
      await service.isEnabled('demo-flag', {
        userId: 'user-1',
        clinicId: 'clinic-1',
      }),
    ).toBe(false);
  });

  it('respects clinic override above rollout when no user override exists', async () => {
    const record = buildRecord({
      defaultEnabled: false,
      clinicOverrides: { 'clinic-1': true },
      percentageRollout: 0,
    });
    const { repo } = buildRepo([record]);
    const service = new FeatureFlagsService(cache, repo, {
      emit: jest.fn(),
    } as never);
    expect(
      await service.isEnabled('demo-flag', {
        userId: 'user-1',
        clinicId: 'clinic-1',
      }),
    ).toBe(true);
  });

  it('uses deterministic percentage rollout', async () => {
    const record = buildRecord({
      defaultEnabled: false,
      percentageRollout: 50,
    });
    const { repo } = buildRepo([record]);
    const service = new FeatureFlagsService(cache, repo, {
      emit: jest.fn(),
    } as never);
    const ctx = { userId: 'user-1', clinicId: 'clinic-1' };
    const a = await service.isEnabled('demo-flag', ctx);
    const b = await service.isEnabled('demo-flag', ctx);
    expect(a).toBe(b);
  });

  it('falls back to defaultEnabled when no overrides apply', async () => {
    const record = buildRecord({ defaultEnabled: true });
    const { repo } = buildRepo([record]);
    const service = new FeatureFlagsService(cache, repo, {
      emit: jest.fn(),
    } as never);
    expect(
      await service.isEnabled('demo-flag', { userId: 'u', clinicId: 'c' }),
    ).toBe(true);
  });

  it('returns the resolved set for a context as a key/bool map', async () => {
    const records = [
      buildRecord({ key: 'one', defaultEnabled: true }),
      buildRecord({ key: 'two', defaultEnabled: false }),
    ];
    const { repo } = buildRepo(records);
    const service = new FeatureFlagsService(cache, repo, {
      emit: jest.fn(),
    } as never);
    const flags = await service.resolveAllForContext({
      userId: 'u',
      clinicId: 'c',
    });
    expect(flags).toEqual({ one: true, two: false });
  });

  it('kill clears overrides and disables the flag', async () => {
    const record = buildRecord({
      defaultEnabled: true,
      clinicOverrides: { c: true },
      userOverrides: { u: true },
      percentageRollout: 100,
    });
    const { repo, kill } = buildRepo([record]);
    const service = new FeatureFlagsService(cache, repo, {
      emit: jest.fn(),
    } as never);
    const result = await service.kill('demo-flag');
    expect(kill).toHaveBeenCalledWith('demo-flag');
    expect(result?.defaultEnabled).toBe(false);
    expect(result?.clinicOverrides).toBeNull();
    expect(result?.userOverrides).toBeNull();
    expect(result?.percentageRollout).toBeNull();
  });
});
