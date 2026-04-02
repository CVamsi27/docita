import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  TIER_PRICING,
  TIER_LIMITS,
  TIER_INFO,
  ANNUAL_DISCOUNT_PERCENT,
  SEMI_ANNUAL_DISCOUNT_PERCENT,
  deriveAnnualPrice,
  TIER_PRICING_BY_CURRENCY,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  getWhatsAppAddonPricingByCurrency,
  REFERRAL_REWARDS_BY_CURRENCY,
  PRICING_CURRENCY_CONFIG,
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

  private getWhatsappBillableConfig(
    tier: keyof typeof TIER_LIMITS,
    currency: SupportedCurrency,
  ): { includedQuota: number; overageRate: number } {
    if (
      tier === 'ESSENTIAL' ||
      tier === 'PROFESSIONAL' ||
      tier === 'ENTERPRISE'
    ) {
      const pricing = getWhatsAppAddonPricingByCurrency(tier, currency);
      return {
        includedQuota: pricing.includedQuota,
        overageRate: pricing.overageRate,
      };
    }
    return { includedQuota: 0, overageRate: 0 };
  }

  private toPricingTierPayload(args: {
    tier: keyof typeof TIER_LIMITS;
    validCurrency: SupportedCurrency;
    monthly: number | 'custom';
    yearly: number | 'custom';
    includedAppointments: number;
    includedUsers: number;
    overageAppointmentRate: number;
    overageUserRate: number;
    features: unknown;
  }) {
    const {
      tier,
      validCurrency,
      monthly,
      yearly,
      includedAppointments,
      includedUsers,
      overageAppointmentRate,
      overageUserRate,
      features,
    } = args;
    const tierDefaults = TIER_LIMITS[tier];
    const whatsapp = this.getWhatsappBillableConfig(tier, validCurrency);

    return {
      id: tier,
      name: TIER_INFO[tier].name,
      description: TIER_INFO[tier].description,
      tagline: TIER_INFO[tier].tagline,
      color: TIER_INFO[tier].color,
      pricing: {
        monthly,
        yearly,
        currency: PRICING_CURRENCY_CONFIG[validCurrency].symbol,
      },
      limits: {
        patients: tierDefaults.patients,
        appointments: includedAppointments,
        storage: tierDefaults.storageGB,
        users: includedUsers,
        doctors: tierDefaults.doctors,
        branches: tierDefaults.branches,
        prescriptions: tierDefaults.prescriptions,
        invoices: tierDefaults.invoices,
        billable: {
          consultations: includedAppointments,
          users: includedUsers,
          whatsappMessages: whatsapp.includedQuota,
        },
      },
      overageRates: {
        consultations: overageAppointmentRate,
        users: overageUserRate,
        whatsappMessages: whatsapp.overageRate,
        appointment: overageAppointmentRate,
        user: overageUserRate,
        patient: 0,
        storage: 0,
        prescription: 0,
        invoice: 0,
        apiCall: 0,
        ocrPage: 0,
      },
      features: this.parseJsonValue(features),
    };
  }

  async getPricingConfig(currency?: string) {
    const validCurrency = this.resolveCurrency(currency);

    const currencyConfig = PRICING_CURRENCY_CONFIG[validCurrency];
    const tierPricing = TIER_PRICING_BY_CURRENCY[validCurrency];
    const overageRates = TIER_OVERAGE_RATES_BY_CURRENCY[validCurrency];
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
        tiers: canonicalTiers.map((tier) => {
          const canonicalTier = (DB_TIER_TO_CANONICAL[tier.tier as string] ??
            tier.tier) as keyof typeof TIER_LIMITS;
          const monthlyPrice =
            canonicalTier === 'ENTERPRISE'
              ? 'custom'
              : tier.monthlyBasePriceCents / 100;
          const yearlyPrice =
            canonicalTier === 'ENTERPRISE'
              ? 'custom'
              : deriveAnnualPrice(tier.monthlyBasePriceCents / 100);
          return this.toPricingTierPayload({
            tier: canonicalTier,
            validCurrency,
            monthly: monthlyPrice,
            yearly: yearlyPrice,
            includedAppointments: tier.includedAppointments,
            includedUsers: tier.includedUsers,
            overageAppointmentRate: tier.overageAppointmentCents / 100,
            overageUserRate: tier.overageUserCents / 100,
            features: tier.features,
          });
        }),
        discounts: {
          annualPercent: ANNUAL_DISCOUNT_PERCENT,
          semiAnnualPercent: SEMI_ANNUAL_DISCOUNT_PERCENT,
          referralCredits: referralRewards.ESSENTIAL,
        },
        referralRewards: referralRewards,
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
          ...this.toPricingTierPayload({
            tier: 'STARTER',
            validCurrency,
            monthly: tierPricing.STARTER.monthly,
            yearly: tierPricing.STARTER.yearly,
            includedAppointments: TIER_LIMITS.STARTER.appointments ?? 0,
            includedUsers: TIER_LIMITS.STARTER.users ?? 1,
            overageAppointmentRate: overageRates.STARTER.appointmentRate,
            overageUserRate: overageRates.STARTER.userRate,
            features: [
              'Up to 50 patients',
              'Consultation scheduling',
              'Digital prescriptions with PDF',
              'Patient profiles & visit history',
              'Paper record scanning & archival',
              'Excel import',
              'Export to CSV',
              'Single doctor',
            ],
          }),
        },
        {
          ...this.toPricingTierPayload({
            tier: 'ESSENTIAL',
            validCurrency,
            monthly: tierPricing.ESSENTIAL.monthly,
            yearly: tierPricing.ESSENTIAL.yearly,
            includedAppointments: TIER_LIMITS.ESSENTIAL.appointments ?? 0,
            includedUsers: TIER_LIMITS.ESSENTIAL.users ?? 1,
            overageAppointmentRate: overageRates.ESSENTIAL.appointmentRate,
            overageUserRate: overageRates.ESSENTIAL.userRate,
            features: [
              'Unlimited patients',
              '500 consultations/month included',
              '1 doctor included',
              'WhatsApp messaging (500 msgs/mo)',
              'Lab tests & inventory',
              'Queue management',
              'Advanced analytics',
              'Audit logs & compliance',
              'Insurance billing',
              'Digital intake forms',
              'Prescription templates',
              'AI features — Coming Soon',
            ],
          }),
        },
        {
          ...this.toPricingTierPayload({
            tier: 'PROFESSIONAL',
            validCurrency,
            monthly: tierPricing.PROFESSIONAL.monthly,
            yearly: tierPricing.PROFESSIONAL.yearly,
            includedAppointments: TIER_LIMITS.PROFESSIONAL.appointments ?? 0,
            includedUsers: TIER_LIMITS.PROFESSIONAL.users ?? 1,
            overageAppointmentRate: overageRates.PROFESSIONAL.appointmentRate,
            overageUserRate: overageRates.PROFESSIONAL.userRate,
            features: [
              'Unlimited patients',
              '2,000 consultations/month included',
              'Up to 5 doctors',
              'WhatsApp messaging (2,000 msgs/mo)',
              'Broadcast campaigns',
              'Patient segmentation',
              'Full EHR (IPD, vitals, clinical notes)',
              'Custom branding on reports',
              'Multi-location analytics',
              'Bulk data import suite',
              'REST API access (10k calls/day)',
              'SSO (Google / Azure AD)',
              'Custom letterhead',
              'Priority support with SLA',
            ],
          }),
        },
        {
          ...this.toPricingTierPayload({
            tier: 'ENTERPRISE',
            validCurrency,
            monthly: tierPricing.ENTERPRISE.monthly,
            yearly: tierPricing.ENTERPRISE.yearly,
            includedAppointments: TIER_LIMITS.ENTERPRISE.appointments ?? 0,
            includedUsers: TIER_LIMITS.ENTERPRISE.users ?? 1,
            overageAppointmentRate: overageRates.ENTERPRISE.appointmentRate,
            overageUserRate: overageRates.ENTERPRISE.userRate,
            features: [
              'Unlimited patients, users & branches',
              'Everything in Professional',
              'Data warehouse export (BI tools)',
              'Custom contract & invoicing',
              'Dedicated account manager',
              'Custom SLA guarantee',
            ],
          }),
        },
      ],
      discounts: {
        annualPercent: ANNUAL_DISCOUNT_PERCENT,
        semiAnnualPercent: SEMI_ANNUAL_DISCOUNT_PERCENT,
        referralCredits: referralRewards.ESSENTIAL,
      },
      referralRewards: referralRewards,
    };
  }

  calculateEstimate(params: {
    tier: string;
    currency?: string;
    billingCycle?: string;
    consultations?: number;
    appointments?: number;
    users?: number;
    whatsappMessages?: number;
  }) {
    const {
      tier,
      currency,
      billingCycle = 'monthly',
      consultations,
      appointments,
      users = 1,
      whatsappMessages = 0,
    } = params;
    const resolvedConsultations = consultations ?? appointments ?? 0;

    const validCurrency = this.resolveCurrency(currency);

    const currencyConfig = PRICING_CURRENCY_CONFIG[validCurrency];
    const tierPricing = TIER_PRICING_BY_CURRENCY[validCurrency];
    const tierOverageRates = TIER_OVERAGE_RATES_BY_CURRENCY[validCurrency];

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

    const consultationOverage =
      Math.max(0, resolvedConsultations - (limits.appointments || 999999)) *
      overageRates.appointmentRate;
    const userOverage =
      Math.max(0, users - (limits.users || 1)) * overageRates.userRate;
    const whatsappPricing =
      tierKey === 'ESSENTIAL' || tierKey === 'PROFESSIONAL'
        ? getWhatsAppAddonPricingByCurrency(tierKey, validCurrency)
        : null;
    const whatsappOverage =
      whatsappPricing && whatsappMessages > whatsappPricing.includedQuota
        ? (whatsappMessages - whatsappPricing.includedQuota) *
          whatsappPricing.overageRate
        : 0;

    const totalOverage = consultationOverage + userOverage + whatsappOverage;

    const annualBase = deriveAnnualPrice(basePrice);
    const annualEquivalent = annualBase / 12;
    const selectedBase =
      billingCycle === 'yearly' ? annualEquivalent : basePrice;
    const subtotal = selectedBase;
    const discount =
      billingCycle === 'yearly'
        ? ANNUAL_DISCOUNT_PERCENT
        : billingCycle === 'semi_annual'
          ? SEMI_ANNUAL_DISCOUNT_PERCENT
          : 0;
    const discountAmount =
      billingCycle === 'yearly'
        ? basePrice - annualEquivalent
        : billingCycle === 'semi_annual'
          ? basePrice * (SEMI_ANNUAL_DISCOUNT_PERCENT / 100)
          : 0;
    const totalMonthly = subtotal + totalOverage;

    const roundFactor = Math.pow(10, currencyConfig.decimalPlaces);
    const roundedTotal = Math.round(totalMonthly * roundFactor) / roundFactor;
    const roundedYearly =
      Math.round((annualBase + totalOverage * 12) * roundFactor) / roundFactor;

    return {
      tier: tierKey,
      billingCycle,
      currency: {
        code: validCurrency,
        symbol: currencyConfig.symbol,
      },
      breakdown: {
        basePrice,
        subtotal,
        discount: {
          percent: discount,
          amount: discountAmount,
        },
        overages: {
          consultations: {
            count: Math.max(
              0,
              resolvedConsultations - (limits.appointments || 999999),
            ),
            charge: consultationOverage,
          },
          users: {
            count: Math.max(0, users - (limits.users || 1)),
            charge: userOverage,
          },
          whatsappMessages: {
            count:
              whatsappPricing &&
              whatsappMessages > whatsappPricing.includedQuota
                ? whatsappMessages - whatsappPricing.includedQuota
                : 0,
            charge: whatsappOverage,
          },
        },
        overageTotal: totalOverage,
      },
      totalMonthly: roundedTotal,
      totalYearly: roundedYearly,
    };
  }
}
