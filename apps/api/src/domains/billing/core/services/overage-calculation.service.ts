import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicTier, Prisma } from '@workspace/db';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import { WHATSAPP_ADDON_PRICING, TIER_OVERAGE_RATES } from '@workspace/types';

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

  async calculateOverageCharges(
    clinicId: string,
    usageData: UsageData,
  ): Promise<OverageResult> {
    const tier = usageData.tier;

    const [tierPricing, addOns] = await Promise.all([
      this.prisma.tierPricing.findUnique({ where: { tier } }),
      this.prisma.clinicAddOn.findMany({
        where: { clinicId, status: 'ACTIVE' },
        include: { addOn: true },
      }),
    ]);

    let totalOverageCharges = 0;
    const breakdown: Record<string, OverageBreakdown> = {};

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

    // WhatsApp is bundled into ESSENTIAL and PROFESSIONAL tiers — use tier-based rate
    const whatsappUsage = usageData.usage.whatsappMessages;
    if (whatsappUsage && whatsappUsage.overage > 0) {
      const tierKey = tier as keyof typeof TIER_OVERAGE_RATES;
      const bundledWhatsapp =
        WHATSAPP_ADDON_PRICING[tierKey as keyof typeof WHATSAPP_ADDON_PRICING];
      if (bundledWhatsapp) {
        const rateCents = Math.round(bundledWhatsapp.overageRate * 100);
        this.addOverage(
          breakdown,
          'whatsappMessages',
          whatsappUsage.overage,
          rateCents,
        );
      } else {
        // Fallback to legacy add-on lookup for older subscriptions
        const whatsappAddOn = addOns.find((a) => a.addOnType === 'WHATSAPP');
        if (whatsappAddOn) {
          const rate = this.getAddOnOverageRate(whatsappAddOn, tier);
          this.addOverage(
            breakdown,
            'whatsappMessages',
            whatsappUsage.overage,
            rate * 100,
          );
        }
      }
    }

    const intelligenceAddOn = addOns.find(
      (a) => a.addOnType === 'INTELLIGENCE',
    );
    if (
      intelligenceAddOn &&
      usageData.usage.aiCredits &&
      usageData.usage.aiCredits.overage > 0
    ) {
      const rate = this.getAddOnOverageRate(intelligenceAddOn, tier);
      this.addOverage(
        breakdown,
        'aiCredits',
        usageData.usage.aiCredits.overage,
        rate * 100,
      );
    }

    for (const key in breakdown) {
      totalOverageCharges += breakdown[key].charge;
    }

    return {
      period: usageData.period,
      totalOverageCharges,
      breakdown,
      currency: DEFAULT_CURRENCY,
    };
  }

  private addOverage(
    breakdown: Record<string, OverageBreakdown>,
    key: string,
    quantity: number,
    rateCents: number,
  ) {
    if (quantity > 0) {
      const charge = (quantity * rateCents) / 100;
      breakdown[key] = {
        quantity,
        rate: rateCents / 100,
        charge,
      };
    }
  }

  private getAddOnOverageRate(
    addOn: { addOn: { overageRateByTier: Prisma.JsonValue } },
    tier: ClinicTier,
  ): number {
    try {
      const overageRates =
        typeof addOn.addOn.overageRateByTier === 'string'
          ? JSON.parse(addOn.addOn.overageRateByTier)
          : (addOn.addOn.overageRateByTier as Record<string, number>);
      return (overageRates[tier] || 0) / 100;
    } catch (error) {
      this.logger.error(`Failed to get overage rate`, error);
      return 0;
    }
  }
}
