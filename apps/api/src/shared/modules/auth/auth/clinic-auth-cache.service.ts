import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ClinicTier,
  SubscriptionStatus,
  IntelligenceAddon,
  PlanMode as DbPlanMode,
} from '@workspace/db';
import type { ClinicFeatureOverrides, PlanMode } from '@workspace/types';
import { CACHE_CONSTANTS } from '@/shared/modules/config/app-constants';
import { readClinicFeatureOverrides } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { clinicHasOutstandingPendingPayment } from '@/shared/modules/auth/utils/clinic-outstanding-pending-payment.util';

interface ClinicAuthCache {
  clinicId: string;
  tier: ClinicTier;
  planMode: PlanMode;
  subscriptionStatus: SubscriptionStatus;
  subscriptionGraceUntil: Date | null;
  subscriptionTrialEnd: Date | null;
  subscriptionCurrentPeriodEnd: Date | null;
  hasOutstandingPendingPayment: boolean;
  hasIntelligence: boolean;
  features: ClinicFeatureOverrides;
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
    planMode: PlanMode;
    subscriptionStatus: SubscriptionStatus;
    subscriptionGraceUntil: Date | null;
    subscriptionTrialEnd: Date | null;
    subscriptionCurrentPeriodEnd: Date | null;
    hasOutstandingPendingPayment: boolean;
    hasIntelligence: boolean;
    features: ClinicFeatureOverrides;
  }> {
    const cached = this.cache.get(clinicId);
    if (!options.bypassCache && cached && this.isCacheFresh(cached)) {
      return {
        tier: cached.tier,
        planMode: cached.planMode,
        subscriptionStatus: cached.subscriptionStatus,
        subscriptionGraceUntil: cached.subscriptionGraceUntil,
        subscriptionTrialEnd: cached.subscriptionTrialEnd,
        subscriptionCurrentPeriodEnd: cached.subscriptionCurrentPeriodEnd,
        hasOutstandingPendingPayment: cached.hasOutstandingPendingPayment,
        hasIntelligence: cached.hasIntelligence,
        features: cached.features,
      };
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        tier: true,
        planMode: true,
        intelligenceAddon: true,
        features: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            graceUntil: true,
            trialEnd: true,
            currentPeriodEnd: true,
          },
        },
        subscriptionPayments: {
          select: { status: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic ${clinicId} not found`);
    }

    // Legacy FRONT_DESK_* tiers force planMode = FRONT_DESK regardless of
    // the persisted column (see mapDbClinicTierToTierAndMode).
    const isLegacyFrontDesk =
      clinic.tier === ClinicTier.FRONT_DESK ||
      clinic.tier === ClinicTier.FRONT_DESK_CLINIC ||
      clinic.tier === ClinicTier.FRONT_DESK_HOSPITAL;
    const planMode: PlanMode = isLegacyFrontDesk
      ? 'FRONT_DESK'
      : ((clinic.planMode ?? DbPlanMode.FULL) as PlanMode);

    const authData = {
      tier: clinic.tier,
      planMode,
      subscriptionStatus: clinic.subscriptionStatus,
      subscriptionGraceUntil: clinic.subscription?.graceUntil ?? null,
      subscriptionTrialEnd: clinic.subscription?.trialEnd ?? null,
      subscriptionCurrentPeriodEnd:
        clinic.subscription?.currentPeriodEnd ?? null,
      hasOutstandingPendingPayment: clinicHasOutstandingPendingPayment(
        clinic.subscriptionPayments,
      ),
      hasIntelligence: clinic.intelligenceAddon === IntelligenceAddon.ACTIVE,
      features: readClinicFeatureOverrides(clinic.features),
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
      planMode: PlanMode;
      subscriptionStatus: SubscriptionStatus;
      subscriptionGraceUntil: Date | null;
      subscriptionTrialEnd: Date | null;
      subscriptionCurrentPeriodEnd: Date | null;
      hasOutstandingPendingPayment: boolean;
      hasIntelligence: boolean;
      features: ClinicFeatureOverrides;
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
