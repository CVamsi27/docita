import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicTier } from '@workspace/db';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import {
  PRICING_CURRENCY_CONFIG,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  type TierName,
  type SupportedCurrency,
} from '@workspace/types';
import { getWhatsAppAddonPricingByCurrency } from '@workspace/utils';

interface UsageData {
  period: { start: Date; end: Date };
  usage: Record<string, { current: number; included: number; overage: number }>;
  tier: ClinicTier;
  currency?: string;
  /**
   * Per-clinic override rates (cents per unit). When present, these shadow the
   * tier defaults — used for Enterprise contracts where rates are negotiated
   * per customer.
   */
  rateOverridesCents?: {
    consultation?: number;
    user?: number;
    whatsapp?: number;
    storage?: number;
  };
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
  constructor(private readonly prisma: PrismaService) {}

  private resolveCurrency(currency?: string): SupportedCurrency {
    const selected = currency?.toUpperCase() as SupportedCurrency | undefined;
    if (
      selected &&
      Object.prototype.hasOwnProperty.call(PRICING_CURRENCY_CONFIG, selected)
    ) {
      return selected;
    }
    return DEFAULT_CURRENCY as SupportedCurrency;
  }

  async calculateOverageCharges(
    _clinicId: string,
    usageData: UsageData,
  ): Promise<OverageResult> {
    const tier = usageData.tier;
    const tierPricing = await this.prisma.tierPricing.findUnique({
      where: { tier },
    });

    let totalOverageCharges = 0;
    const breakdown: Record<string, OverageBreakdown> = {};
    const tierKey = tier as TierName;
    const resolvedCurrency = this.resolveCurrency(usageData.currency);
    const baseRates = TIER_OVERAGE_RATES_BY_CURRENCY[resolvedCurrency][tierKey];
    const whatsappRate =
      tierKey === 'ESSENTIAL' ||
      tierKey === 'PROFESSIONAL' ||
      tierKey === 'ENTERPRISE'
        ? getWhatsAppAddonPricingByCurrency(tierKey, resolvedCurrency)
            .overageRate
        : 0;
    const canUseTierPricingTable = tierPricing && resolvedCurrency === 'INR';
    const overrides = usageData.rateOverridesCents ?? {};

    const consultationRateCents =
      overrides.consultation ??
      (canUseTierPricingTable
        ? tierPricing!.overageAppointmentCents
        : baseRates.appointmentRate * 100);

    const userRateCents =
      overrides.user ??
      (canUseTierPricingTable
        ? tierPricing!.overageUserCents
        : baseRates.userRate * 100);

    this.addOverage(
      breakdown,
      'consultations',
      usageData.usage.consultations?.overage || 0,
      consultationRateCents,
    );
    this.addOverage(
      breakdown,
      'users',
      usageData.usage.users?.overage || 0,
      userRateCents,
    );

    const whatsappUsage = usageData.usage.whatsappMessages;
    const whatsappRateCents =
      overrides.whatsapp ?? (whatsappRate > 0 ? whatsappRate * 100 : 0);
    if (whatsappUsage && whatsappUsage.overage > 0 && whatsappRateCents > 0) {
      this.addOverage(
        breakdown,
        'whatsappMessages',
        whatsappUsage.overage,
        whatsappRateCents,
      );
    }

    const storageUsage = usageData.usage.storageGB;
    const storageRateCents = overrides.storage ?? 0;
    if (storageUsage && storageUsage.overage > 0 && storageRateCents > 0) {
      this.addOverage(
        breakdown,
        'storageGB',
        storageUsage.overage,
        storageRateCents,
      );
    }

    for (const key in breakdown) {
      totalOverageCharges += breakdown[key].charge;
    }

    return {
      period: usageData.period,
      totalOverageCharges,
      breakdown,
      currency: resolvedCurrency,
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
}
