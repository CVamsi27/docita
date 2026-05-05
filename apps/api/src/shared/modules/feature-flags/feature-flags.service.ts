import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import {
  FeatureFlagRecord,
  FeatureFlagsRepository,
} from '@/shared/modules/feature-flags/feature-flags.repository';

const RESOLVED_CACHE_PREFIX = 'feature-flags:resolved:';
const RESOLVED_CACHE_TTL_MS = 30_000;
const ALL_CACHE_KEY = 'feature-flags:all';
const ALL_CACHE_TTL_MS = 30_000;

export interface FeatureFlagContext {
  clinicId?: string | null;
  userId?: string | null;
}

const computeBucket = (clinicId: string, userId: string): number => {
  const hash = createHash('sha256').update(`${clinicId}:${userId}`).digest();
  const slice = hash.readUInt32BE(0);
  return slice % 100;
};

const resolveBoolean = (
  record: FeatureFlagRecord,
  ctx: FeatureFlagContext,
): boolean => {
  if (ctx.userId) {
    const userOverride = record.userOverrides?.[ctx.userId];
    if (typeof userOverride === 'boolean') return userOverride;
  }
  if (ctx.clinicId) {
    const clinicOverride = record.clinicOverrides?.[ctx.clinicId];
    if (typeof clinicOverride === 'boolean') return clinicOverride;
  }
  if (
    typeof record.percentageRollout === 'number' &&
    ctx.clinicId &&
    ctx.userId
  ) {
    const bucket = computeBucket(ctx.clinicId, ctx.userId);
    return bucket < record.percentageRollout;
  }
  return record.defaultEnabled;
};

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly repository: FeatureFlagsRepository,
  ) {}

  async isEnabled(key: string, ctx: FeatureFlagContext): Promise<boolean> {
    const record = await this.repository.findByKey(key);
    if (!record) return false;
    return resolveBoolean(record, ctx);
  }

  async resolveAllForContext(
    ctx: FeatureFlagContext,
  ): Promise<Record<string, boolean>> {
    const cacheKey = `${RESOLVED_CACHE_PREFIX}${ctx.clinicId ?? '-'}:${ctx.userId ?? '-'}`;
    const cached = await this.cache.get<Record<string, boolean>>(cacheKey);
    if (cached) return cached;
    const records = await this.findAll();
    const resolved = Object.fromEntries(
      records.map((record) => [record.key, resolveBoolean(record, ctx)]),
    );
    await this.cache.set(cacheKey, resolved, RESOLVED_CACHE_TTL_MS);
    return resolved;
  }

  async findAll(): Promise<FeatureFlagRecord[]> {
    const cached = await this.cache.get<FeatureFlagRecord[]>(ALL_CACHE_KEY);
    if (cached) return cached;
    const rows = await this.repository.findAll();
    await this.cache.set(ALL_CACHE_KEY, rows, ALL_CACHE_TTL_MS);
    return rows;
  }

  async upsert(record: FeatureFlagRecord): Promise<FeatureFlagRecord> {
    const stored = await this.repository.upsert(record);
    await this.invalidateAll();
    return stored;
  }

  async kill(key: string): Promise<FeatureFlagRecord | null> {
    const result = await this.repository.kill(key);
    await this.invalidateAll();
    if (result) {
      this.logger.warn(`Feature flag "${key}" kill-switch activated`);
    }
    return result;
  }

  private async invalidateAll(): Promise<void> {
    await this.cache.del(ALL_CACHE_KEY);
    // Resolved-context entries will time out within RESOLVED_CACHE_TTL_MS;
    // we deliberately accept that brief staleness instead of scanning keys
    // (which the in-memory cache adapter does not support).
  }
}
