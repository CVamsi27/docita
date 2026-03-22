import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  TIER_PRICING,
  TIER_LIMITS,
  ANNUAL_DISCOUNT_PERCENT,
  SEMI_ANNUAL_DISCOUNT_PERCENT,
  TIER_PRICING_BY_CURRENCY,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  WHATSAPP_ADDON_PRICING_BY_CURRENCY,
  INTELLIGENCE_ADDON_PRICING_BY_CURRENCY,
  REFERRAL_REWARDS_BY_CURRENCY,
  PRICING_CURRENCY_CONFIG,
  AI_CREDIT_COSTS,
  DISCOUNT_CONFIG,
  SupportedCurrency,
} from '@workspace/types';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  private readonly supportedCurrencies = Object.keys(
    PRICING_CURRENCY_CONFIG,
  ) as SupportedCurrency[];

  private resolveCurrency(currency?: string): SupportedCurrency {
    const selectedCurrency = currency?.toUpperCase() as
      | SupportedCurrency
      | undefined;
    if (
      selectedCurrency &&
      this.supportedCurrencies.includes(selectedCurrency)
    ) {
      return selectedCurrency;
    }

    return this.supportedCurrencies[0];
  }

  private parseJsonValue(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }

    return value;
  }

  private readNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  async getPricingConfig(currency?: string) {
    const validCurrency = this.resolveCurrency(currency);

    const currencyConfig = PRICING_CURRENCY_CONFIG[validCurrency];
    const tierPricing = TIER_PRICING_BY_CURRENCY[validCurrency];
    const overageRates = TIER_OVERAGE_RATES_BY_CURRENCY[validCurrency];
    const intelligencePricing =
      INTELLIGENCE_ADDON_PRICING_BY_CURRENCY[validCurrency];
    const referralRewards = REFERRAL_REWARDS_BY_CURRENCY[validCurrency];

    const DB_TIER_TO_CANONICAL: Record<string, string> = {
      CAPTURE: 'STARTER',
      CORE: 'ESSENTIAL',
      PRO: 'PROFESSIONAL',
      ENTERPRISE: 'ENTERPRISE',
    };

    const LEGACY_DB_TIERS = new Set(['PLUS', 'CLINIC']);

    const dbTiers = await this.prisma.tierPricing.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    const dbAddOns = await this.prisma.addOn.findMany({
      where: { isActive: true },
    });

    const dbDiscounts = await this.prisma.discount.findMany({
      where: { isActive: true },
    });

    if (dbTiers.length > 0) {
      const canonicalTiers = dbTiers.filter(
        (t) => !LEGACY_DB_TIERS.has(t.tier as string),
      );

      return {
        currency: {
          code: validCurrency,
          symbol: currencyConfig.symbol,
          name: currencyConfig.name,
        },
        supportedCurrencies: Object.entries(PRICING_CURRENCY_CONFIG).map(
          ([code, cfg]) => ({
            code,
            symbol: cfg.symbol,
            name: cfg.name,
          }),
        ),
        tiers: canonicalTiers.map((tier) => ({
          id: DB_TIER_TO_CANONICAL[tier.tier as string] ?? tier.tier,
          name: tier.name,
          description: tier.description,
          tagline: tier.tagline,
          color: tier.color,
          pricing: {
            monthly: tier.monthlyBasePriceCents / 100,
            yearly: Math.round(
              (tier.monthlyBasePriceCents / 100) *
                12 *
                (1 - ANNUAL_DISCOUNT_PERCENT / 100),
            ),
            currency: currencyConfig.symbol,
          },
          limits: {
            patients: tier.includedPatients,
            appointments: tier.includedAppointments,
            storage: tier.includedStorageGB,
            users: tier.includedUsers,
          },
          overageRates: {
            patient: tier.overagePatientCents / 100,
            appointment: tier.overageAppointmentCents / 100,
            storage: tier.overageStorageCents / 100,
            user: tier.overageUserCents / 100,
          },
          features: this.parseJsonValue(tier.features),
        })),
        addOns: dbAddOns
          .filter((addOn) => addOn.type !== 'WHATSAPP')
          .map((addOn) => ({
            id: addOn.type,
            name: addOn.name,
            description: addOn.description,
            icon: addOn.icon,
            pricingByTier: this.parseJsonValue(addOn.pricingByTier),
            includedQuotaByTier: this.parseJsonValue(addOn.includedQuotaByTier),
            overageRateByTier: this.parseJsonValue(addOn.overageRateByTier),
            features: this.parseJsonValue(addOn.features),
          })),
        discounts: dbDiscounts.map((discount) => ({
          type: discount.type,
          name: discount.name,
          description: discount.description,
          percentOff: discount.percentOff,
          maxCombined: discount.maxCombinedPercent,
          badgeText: discount.badgeText,
        })),
        referralRewards: referralRewards,
        aiCreditCosts: AI_CREDIT_COSTS,
        discountPercents: {
          annual: ANNUAL_DISCOUNT_PERCENT,
          semiAnnual: SEMI_ANNUAL_DISCOUNT_PERCENT,
        },
      };
    }

    return {
      currency: {
        code: validCurrency,
        symbol: currencyConfig.symbol,
        name: currencyConfig.name,
      },
      supportedCurrencies: Object.entries(PRICING_CURRENCY_CONFIG).map(
        ([code, cfg]) => ({
          code,
          symbol: cfg.symbol,
          name: cfg.name,
        }),
      ),
      tiers: [
        {
          id: 'STARTER',
          name: 'Docita Starter',
          description: 'Basic clinical workflow for free',
          tagline: 'Free forever',
          color: 'gray',
          pricing: {
            monthly: tierPricing.STARTER.monthly,
            yearly: tierPricing.STARTER.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.STARTER,
          overageRates: overageRates.STARTER,
          features: [
            'Up to 50 patients',
            'Calendar & appointment scheduling',
            'Digital prescriptions with PDF',
            'Patient profiles & visit history',
            'Paper record scanning & archival',
            'Excel import',
            'Export to CSV',
            'Single doctor',
          ],
        },
        {
          id: 'ESSENTIAL',
          name: 'Docita Essential',
          description: 'Professional practice management for solo clinics',
          tagline: 'Solo Clinic Pro',
          color: 'blue',
          pricing: {
            monthly: tierPricing.ESSENTIAL.monthly,
            yearly: tierPricing.ESSENTIAL.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.ESSENTIAL,
          overageRates: overageRates.ESSENTIAL,
          features: [
            '500 active patients included',
            '1,000 appointments/month',
            'Everything in Starter',
            'Invoicing & billing',
            'Basic analytics dashboard',
            'ICD-10/CPT medical coding',
            'Prescription templates',
            'Digital consent management',
            'Doctor signature on prescriptions',
            '3 users included',
            'Email support',
          ],
        },
        {
          id: 'PROFESSIONAL',
          name: 'Docita Professional',
          description: 'Full-featured solution for multi-doctor clinics',
          tagline: 'Multi-Doctor Clinics',
          color: 'purple',
          pricing: {
            monthly: tierPricing.PROFESSIONAL.monthly,
            yearly: tierPricing.PROFESSIONAL.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.PROFESSIONAL,
          overageRates: overageRates.PROFESSIONAL,
          features: [
            '10,000 active patients included',
            '20,000 appointments/month',
            'Everything in Essential',
            'Unlimited doctors',
            'Multi-clinic branching (up to 5)',
            'Lab tests catalog & tracking',
            'Inventory & pharmacy module',
            'Token queue management',
            'Audit logs & compliance',
            'Advanced analytics',
            '15 users included',
            'Priority support',
          ],
        },
        {
          id: 'ENTERPRISE',
          name: 'Docita Enterprise',
          description: 'Hospital-grade solution with full customization',
          tagline: 'Hospital-Grade System',
          color: 'orange',
          pricing: {
            monthly: tierPricing.ENTERPRISE.monthly,
            yearly: tierPricing.ENTERPRISE.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.ENTERPRISE,
          overageRates: overageRates.ENTERPRISE,
          features: [
            'Unlimited patients',
            'Unlimited appointments',
            'Everything in Professional',
            'Unlimited doctors & branches',
            'Full EHR capabilities',
            'API access (10k calls/day)',
            'SSO & advanced security',
            'Custom branding & white-label',
            'Data warehouse export',
            'Dedicated account manager',
            'SLA guarantee',
          ],
        },
      ],
      addOns: [
        {
          id: 'INTELLIGENCE',
          name: 'Docita Intelligence',
          description: 'AI-powered clinical assistant',
          icon: 'Sparkles',
          pricingByTier: intelligencePricing,
          features: [
            'AI-assisted clinical notes',
            'Smart prescription suggestions',
            'Voice-to-text dictation',
            'Predictive no-show alerts',
            'Patient risk segmentation',
            'Anomaly detection',
            'Treatment insights',
            'Automated coding suggestions',
          ],
          creditCosts: AI_CREDIT_COSTS,
        },
      ],
      discounts: DISCOUNT_CONFIG,
      referralRewards: referralRewards,
      discountPercents: {
        annual: ANNUAL_DISCOUNT_PERCENT,
        semiAnnual: SEMI_ANNUAL_DISCOUNT_PERCENT,
      },
    };
  }

  calculateEstimate(params: {
    tier: string;
    currency?: string;
    billingCycle?: string;
    patients?: number;
    appointments?: number;
    users?: number;
    whatsappMessages?: number;
    intelligence?: boolean;
    aiCredits?: number;
  }) {
    const {
      tier,
      currency,
      billingCycle = 'monthly',
      patients = 0,
      appointments = 0,
      users = 1,
      whatsappMessages = 0,
      intelligence = false,
      aiCredits = 0,
    } = params;

    const validCurrency = this.resolveCurrency(currency);

    const currencyConfig = PRICING_CURRENCY_CONFIG[validCurrency];
    const tierPricing = TIER_PRICING_BY_CURRENCY[validCurrency];
    const tierOverageRates = TIER_OVERAGE_RATES_BY_CURRENCY[validCurrency];
    const whatsappPricing = WHATSAPP_ADDON_PRICING_BY_CURRENCY[validCurrency];
    const intelligencePricing =
      INTELLIGENCE_ADDON_PRICING_BY_CURRENCY[validCurrency];

    const LEGACY_TIER_MAP: Record<string, string> = {
      CAPTURE: 'STARTER',
      CORE: 'ESSENTIAL',
      PLUS: 'ESSENTIAL',
      PRO: 'PROFESSIONAL',
      CLINIC: 'PROFESSIONAL',
    };

    const rawKey = tier.toUpperCase();
    const tierKey = (LEGACY_TIER_MAP[rawKey] ??
      rawKey) as keyof typeof TIER_PRICING;

    if (!TIER_PRICING[tierKey] || tierKey === 'INTELLIGENCE') {
      return { error: 'Invalid tier' };
    }

    const pricing = tierPricing[tierKey];
    const limits = TIER_LIMITS[tierKey];
    const overageRates = tierOverageRates[tierKey];

    if (tierKey === 'ENTERPRISE') {
      return {
        tier: tierKey,
        currency: {
          code: validCurrency,
          symbol: currencyConfig.symbol,
        },
        basePrice: 'Contact Sales',
        totalMonthly: 'Contact Sales',
        message:
          'Enterprise pricing is customized to your needs. Contact our sales team.',
      };
    }

    const basePrice = this.readNumber(pricing.monthly);

    const patientOverage =
      Math.max(0, patients - limits.patients) * overageRates.patientRate;
    const appointmentOverage =
      Math.max(0, appointments - (limits.appointments || 999999)) *
      overageRates.appointmentRate;
    const userOverage =
      Math.max(0, users - (limits.users || 1)) * overageRates.userRate;

    let totalOverage = patientOverage + appointmentOverage + userOverage;

    let addOnCosts = 0;
    const addOnsBreakdown: Record<string, { base: number; overage: number }> =
      {};

    if (tierKey !== 'STARTER') {
      const waPrice = whatsappPricing[tierKey as keyof typeof whatsappPricing];
      const waOverage =
        Math.max(0, whatsappMessages - waPrice.includedQuota) *
        waPrice.overageRate;

      totalOverage += waOverage;
      addOnsBreakdown.whatsapp = { base: 0, overage: waOverage };
    }

    if (intelligence && tierKey !== 'STARTER') {
      const aiPrice =
        intelligencePricing[tierKey as keyof typeof intelligencePricing];
      const aiBase = this.readNumber(aiPrice.basePrice);
      const aiOverage =
        Math.max(0, aiCredits - aiPrice.includedQuota) * aiPrice.overageRate;

      addOnCosts += aiBase;
      totalOverage += aiOverage;
      addOnsBreakdown.intelligence = { base: aiBase, overage: aiOverage };
    }

    let discount = 0;
    if (billingCycle === 'yearly') {
      discount = ANNUAL_DISCOUNT_PERCENT;
    } else if (billingCycle === 'semi_annual') {
      discount = SEMI_ANNUAL_DISCOUNT_PERCENT;
    }

    const subtotal = basePrice + addOnCosts;
    const discountAmount = subtotal * (discount / 100);
    const totalMonthly = subtotal - discountAmount + totalOverage;

    const roundFactor = Math.pow(10, currencyConfig.decimalPlaces);
    const roundedTotal = Math.round(totalMonthly * roundFactor) / roundFactor;
    const roundedYearly =
      Math.round(totalMonthly * 12 * roundFactor) / roundFactor;

    return {
      tier: tierKey,
      billingCycle,
      currency: {
        code: validCurrency,
        symbol: currencyConfig.symbol,
      },
      breakdown: {
        basePrice,
        addOns: addOnsBreakdown,
        addOnTotal: addOnCosts,
        subtotal,
        discount: {
          percent: discount,
          amount: discountAmount,
        },
        overages: {
          patients: {
            count: Math.max(0, patients - limits.patients),
            charge: patientOverage,
          },
          appointments: {
            count: Math.max(0, appointments - (limits.appointments || 999999)),
            charge: appointmentOverage,
          },
          users: {
            count: Math.max(0, users - (limits.users || 1)),
            charge: userOverage,
          },
        },
        overageTotal: totalOverage,
      },
      totalMonthly: roundedTotal,
      totalYearly: roundedYearly,
    };
  }
}
