import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  COUNTER_BURST_KEY_PREFIX,
  COUNTER_MONTHLY_KEY_PREFIX,
  COUNTER_SUSTAINED_KEY_PREFIX,
  MONTHLY_FLUSH_BATCH_SIZE,
  QUOTA_CACHE_KEY_PREFIX,
  QUOTA_CACHE_TTL_MS,
  RATE_LIMIT_BURST_WINDOW_MS,
  RATE_LIMIT_SUSTAINED_WINDOW_MS,
} from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.constants';
import { TenantRateLimitRepository } from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.repository';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  QuotaUpsertInput,
  RateLimitDecision,
  TenantQuota,
} from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.types';

interface ResolvedQuota extends TenantQuota {
  hasOverride: boolean;
}

interface CacheCounter {
  count: number;
  resetAtMs: number;
}

@Injectable()
export class TenantRateLimitService implements OnModuleInit {
  private readonly logger = new Logger(TenantRateLimitService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly repository: TenantRateLimitRepository,
    private readonly config: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  onModuleInit(): void {
    if (!this.config.isTest()) {
      this.logger.warn(
        'Tenant burst and sustained rate counters use the in-process Nest cache-manager store. ' +
          'Enforcement is best-effort per API replica until a shared counter store is introduced.',
      );
    }
  }

  async getQuota(clinicId: string): Promise<ResolvedQuota> {
    const cacheKey = `${QUOTA_CACHE_KEY_PREFIX}${clinicId}`;
    const cached = await this.cache.get<ResolvedQuota>(cacheKey);
    if (cached) return cached;

    const persisted = await this.repository.findQuota(clinicId);
    const defaults = this.config.getTenantRateLimitDefaults();
    const resolved: ResolvedQuota = persisted
      ? { ...persisted, hasOverride: true }
      : {
          rps: defaults.rps,
          rpm: defaults.rpm,
          monthlyBudget: defaults.monthlyBudget,
          currentMonthUsed: 0,
          currentMonthResetsAt: this.nextMonthResetDate(),
          hasOverride: false,
        };
    await this.cache.set(cacheKey, resolved, QUOTA_CACHE_TTL_MS);
    return resolved;
  }

  async upsertQuota(
    clinicId: string,
    input: QuotaUpsertInput,
  ): Promise<TenantQuota> {
    const updated = await this.repository.upsertQuota(clinicId, input);
    await this.cache.del(`${QUOTA_CACHE_KEY_PREFIX}${clinicId}`);
    return updated;
  }

  async checkAndConsume(clinicId: string): Promise<RateLimitDecision[]> {
    const quota = await this.getQuota(clinicId);
    const now = Date.now();

    const burst = await this.consumeWindow({
      key: `${COUNTER_BURST_KEY_PREFIX}${clinicId}`,
      windowMs: RATE_LIMIT_BURST_WINDOW_MS,
      limit: quota.rps,
      now,
    });
    burst.reason = 'burst';

    if (!burst.allowed) return [burst];

    const sustained = await this.consumeWindow({
      key: `${COUNTER_SUSTAINED_KEY_PREFIX}${clinicId}`,
      windowMs: RATE_LIMIT_SUSTAINED_WINDOW_MS,
      limit: quota.rpm,
      now,
    });
    sustained.reason = 'sustained';

    if (!sustained.allowed) return [sustained];

    const monthly = await this.consumeMonthly(clinicId, quota, now);

    if (!monthly.allowed) return [monthly];

    return [burst, sustained, monthly];
  }

  async resetCountersForTest(clinicId: string): Promise<void> {
    await this.cache.del(`${QUOTA_CACHE_KEY_PREFIX}${clinicId}`);
    await this.cache.del(`${COUNTER_BURST_KEY_PREFIX}${clinicId}`);
    await this.cache.del(`${COUNTER_SUSTAINED_KEY_PREFIX}${clinicId}`);
    await this.cache.del(`${COUNTER_MONTHLY_KEY_PREFIX}${clinicId}`);
  }

  private async consumeWindow(args: {
    key: string;
    windowMs: number;
    limit: number;
    now: number;
  }): Promise<RateLimitDecision> {
    const { key, windowMs, limit, now } = args;
    const existing = await this.cache.get<CacheCounter>(key);
    let counter: CacheCounter;
    if (!existing || existing.resetAtMs <= now) {
      counter = { count: 1, resetAtMs: now + windowMs };
    } else {
      counter = { count: existing.count + 1, resetAtMs: existing.resetAtMs };
    }

    const ttl = Math.max(counter.resetAtMs - now, 1);
    await this.cache.set(key, counter, ttl);

    const remaining = Math.max(limit - counter.count, 0);
    const resetSeconds = Math.max(Math.ceil(ttl / 1000), 1);
    const allowed = counter.count <= limit;

    return {
      allowed,
      limit,
      remaining,
      resetSeconds,
      windowMs,
    };
  }

  private async consumeMonthly(
    clinicId: string,
    quota: ResolvedQuota,
    now: number,
  ): Promise<RateLimitDecision> {
    const key = `${COUNTER_MONTHLY_KEY_PREFIX}${clinicId}`;
    const resetAtMs = quota.currentMonthResetsAt.getTime();
    const ttl = Math.max(resetAtMs - now, 1);

    const existing =
      (await this.cache.get<CacheCounter>(key)) ??
      ({
        count: quota.currentMonthUsed,
        resetAtMs,
      } satisfies CacheCounter);

    let counter: CacheCounter;
    if (existing.resetAtMs <= now) {
      counter = { count: 1, resetAtMs: now + ttl };
    } else {
      counter = {
        count: existing.count + 1,
        resetAtMs: existing.resetAtMs,
      };
    }

    await this.cache.set(key, counter, ttl);

    if (
      quota.hasOverride &&
      counter.count - quota.currentMonthUsed >= MONTHLY_FLUSH_BATCH_SIZE
    ) {
      await this.flushMonthlyToDb(clinicId, counter, quota);
    }

    const remaining = Math.max(quota.monthlyBudget - counter.count, 0);
    const resetSeconds = Math.max(Math.ceil(ttl / 1000), 1);
    const allowed = counter.count <= quota.monthlyBudget;

    return {
      allowed,
      limit: quota.monthlyBudget,
      remaining,
      resetSeconds,
      windowMs: ttl,
      reason: 'monthly',
    };
  }

  private async flushMonthlyToDb(
    clinicId: string,
    counter: CacheCounter,
    quota: ResolvedQuota,
  ): Promise<void> {
    const delta = counter.count - quota.currentMonthUsed;
    if (delta <= 0) return;
    try {
      const updated = await this.repository.incrementMonthlyUsage(
        clinicId,
        delta,
      );
      if (updated) {
        const refreshed: ResolvedQuota = {
          ...updated,
          hasOverride: true,
        };
        await this.cache.set(
          `${QUOTA_CACHE_KEY_PREFIX}${clinicId}`,
          refreshed,
          QUOTA_CACHE_TTL_MS,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to flush monthly rate-limit counter for clinic ${clinicId}: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
    }
  }

  private nextMonthResetDate(): Date {
    const now = this.clock.now();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
    );
  }
}
