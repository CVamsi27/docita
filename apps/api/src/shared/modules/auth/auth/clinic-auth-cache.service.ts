import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ClinicTier,
  SubscriptionStatus,
  IntelligenceAddon,
} from '@workspace/db';
import { CACHE_CONSTANTS } from '@/shared/modules/config/app-constants';

interface ClinicAuthCache {
  clinicId: string;
  tier: ClinicTier;
  subscriptionStatus: SubscriptionStatus;
  hasIntelligence: boolean;
  features: Record<string, boolean>;
  cachedAt: number;
}

@Injectable()
export class ClinicAuthCacheService {
  private readonly logger = new Logger(ClinicAuthCacheService.name);
  private cache = new Map<string, ClinicAuthCache>();

  constructor(private prisma: PrismaService) {}

  async getClinicAuth(
    clinicId: string,
    options: { bypassCache?: boolean } = {},
  ): Promise<{
    tier: ClinicTier;
    subscriptionStatus: SubscriptionStatus;
    hasIntelligence: boolean;
    features: Record<string, boolean>;
  }> {
    const cached = this.cache.get(clinicId);
    if (!options.bypassCache && cached && this.isCacheFresh(cached)) {
      return {
        tier: cached.tier,
        subscriptionStatus: cached.subscriptionStatus,
        hasIntelligence: cached.hasIntelligence,
        features: cached.features,
      };
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true,
        subscriptionStatus: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic ${clinicId} not found`);
    }

    const authData = {
      tier: clinic.tier,
      subscriptionStatus: clinic.subscriptionStatus,
      hasIntelligence: clinic.intelligenceAddon === IntelligenceAddon.ACTIVE,
      features: (clinic.features as Record<string, boolean>) || {},
    };

    this.setCache(clinicId, authData);

    return authData;
  }

  invalidate(clinicId: string): void {
    this.cache.delete(clinicId);
    this.logger.log(`Cache invalidated for clinic: ${clinicId}`);
  }

  invalidateAll(): void {
    this.cache.clear();
    this.logger.log('All clinic auth cache invalidated');
  }

  getCacheStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    utilizationPercent: number;
  } {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONSTANTS.MAX_CLINIC_AUTH_CACHE_SIZE,
      ttlMs: CACHE_CONSTANTS.CLINIC_AUTH_TTL_MS,
      utilizationPercent:
        (this.cache.size / CACHE_CONSTANTS.MAX_CLINIC_AUTH_CACHE_SIZE) * 100,
    };
  }

  private isCacheFresh(cached: ClinicAuthCache): boolean {
    const age = Date.now() - cached.cachedAt;
    return age < CACHE_CONSTANTS.CLINIC_AUTH_TTL_MS;
  }

  private setCache(
    clinicId: string,
    authData: {
      tier: ClinicTier;
      subscriptionStatus: SubscriptionStatus;
      hasIntelligence: boolean;
      features: Record<string, boolean>;
    },
  ): void {
    if (this.cache.size >= CACHE_CONSTANTS.MAX_CLINIC_AUTH_CACHE_SIZE) {
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(clinicId, {
      clinicId,
      ...authData,
      cachedAt: Date.now(),
    });
  }

  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.cachedAt < oldestTime) {
        oldestTime = value.cachedAt;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}
