/**
 * Overage Calculation Service (SRP)
 *
 * Single Responsibility: Calculate overage charges for billing periods.
 * Extracted from UsageTrackingService (558 lines) to isolate billing math.
 *
 * Cost Optimization:
 * - Single query for add-ons instead of N+1
 * - Reuses usage data instead of re-querying
 * - Pure calculation methods are easier to cache/memoize
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClinicTier } from '@workspace/db';

interface UsageData {
  period: { start: Date; end: Date };
  usage: Record<string, { current: number; included: number; overage: number }>;
  tier: ClinicTier;
}

interface OverageBreakdown {
  quantity: number;
  rate: number;
  charge: number;
}

interface OverageResult {
  period: { start: Date; end: Date };
  totalOverageCharges: number;
  breakdown: Record<string, OverageBreakdown>;
  currency: string;
}

@Injectable()
export class OverageCalculationService {
  private readonly logger = new Logger(OverageCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate overage charges for a clinic's current billing period
   *
   * Optimized: Fetches tier pricing + add-ons in parallel (was sequential)
   */
  async calculateOverageCharges(
    clinicId: string,
    usageData: UsageData,
  ): Promise<OverageResult> {
    const tier = usageData.tier;

    // Parallel fetches (cost optimization: 2 sequential → 1 parallel batch)
    const [tierPricing, addOns] = await Promise.all([
      this.prisma.tierPricing.findUnique({ where: { tier } }),
      this.prisma.clinicAddOn.findMany({
        where: { clinicId, status: 'ACTIVE' },
        include: { addOn: true },
      }),
    ]);

    let totalOverageCharges = 0;
    const breakdown: Record<string, OverageBreakdown> = {};

    // Base tier overages
    if (tierPricing) {
      this.addOverage(
        breakdown,
        'activePatients',
        usageData.usage.activePatients?.overage || 0,
        tierPricing.overagePatientCents,
      );
      this.addOverage(
        breakdown,
        'appointments',
        usageData.usage.appointments?.overage || 0,
        tierPricing.overageAppointmentCents,
      );
      this.addOverage(
        breakdown,
        'users',
        usageData.usage.users?.overage || 0,
        tierPricing.overageUserCents,
      );
    }

    // Add-on overages
    const whatsappAddOn = addOns.find((a) => a.addOnType === 'WHATSAPP');
    if (whatsappAddOn && usageData.usage.whatsappMessages?.overage > 0) {
      const rate = this.getAddOnOverageRate(whatsappAddOn, tier);
      this.addOverage(
        breakdown,
        'whatsappMessages',
        usageData.usage.whatsappMessages.overage,
        rate * 100,
      );
    }

    const intelligenceAddOn = addOns.find(
      (a) => a.addOnType === 'INTELLIGENCE',
    );
    if (intelligenceAddOn && usageData.usage.aiCredits?.overage > 0) {
      const rate = this.getAddOnOverageRate(intelligenceAddOn, tier);
      this.addOverage(
        breakdown,
        'aiCredits',
        usageData.usage.aiCredits.overage,
        rate * 100,
      );
    }

    // Sum up total
    for (const item of Object.values(breakdown)) {
      totalOverageCharges += item.charge;
    }

    return {
      period: usageData.period,
      totalOverageCharges,
      breakdown,
      currency: 'INR',
    };
  }

  // ========================================================================
  // Private Helpers (testable, pure functions)
  // ========================================================================

  private addOverage(
    breakdown: Record<string, OverageBreakdown>,
    key: string,
    quantity: number,
    rateCents: number,
  ): void {
    if (quantity <= 0) return;

    const charge = (quantity * rateCents) / 100;
    breakdown[key] = {
      quantity,
      rate: rateCents / 100,
      charge,
    };
  }

  private getAddOnOverageRate(
    addOn: { id: string; addOn: { overageRateByTier: unknown } },
    tier: string,
  ): number {
    try {
      const rateMap = JSON.parse(addOn.addOn.overageRateByTier as string);
      return (rateMap[tier] || 0) / 100;
    } catch {
      this.logger.warn(`Failed to parse overage rate for add-on ${addOn.id}`);
      return 0;
    }
  }
}
