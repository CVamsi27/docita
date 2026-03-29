import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  TIER_PRICING,
  TIER_LIMITS,
  ANNUAL_DISCOUNT_PERCENT,
  SEMI_ANNUAL_DISCOUNT_PERCENT,
  TIER_PRICING_BY_CURRENCY,
  TIER_OVERAGE_RATES_BY_CURRENCY,
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
        addOns: [],
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
          name: 'Docita Pro',
          description:
            'All features included. Pay only for what you use beyond your base quota.',
          tagline: 'Scale with your clinic',
          color: 'blue',
          pricing: {
            monthly: tierPricing.ESSENTIAL.monthly,
            yearly: tierPricing.ESSENTIAL.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.ESSENTIAL,
          overageRates: overageRates.ESSENTIAL,
          features: [
            '1,000 patients included',
            '2,000 appointments/month',
            '5 users included',
            'WhatsApp messaging (500 msgs/mo)',
            'Multi-doctor & multi-branch',
            'Lab tests & inventory',
            'Queue management',
            'Advanced analytics',
            'Audit logs & compliance',
            'Insurance billing',
            'Digital intake forms',
            'AI features — Coming Soon',
          ],
        },
        {
          id: 'PROFESSIONAL',
          name: 'Docita Clinic',
          description:
            'Full EHR, API access, custom branding, and broadcast campaigns for scaling practices.',
          tagline: 'Built for growing clinics',
          color: 'purple',
          pricing: {
            monthly: tierPricing.PROFESSIONAL.monthly,
            yearly: tierPricing.PROFESSIONAL.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.PROFESSIONAL,
          overageRates: overageRates.PROFESSIONAL,
          features: [
            '5,000 patients included',
            '10,000 appointments/month',
            '20 users included',
            'WhatsApp messaging (2,000 msgs/mo)',
            'Broadcast campaigns',
            'Patient segmentation',
            'Full EHR (IPD, vitals, clinical notes)',
            'Custom branding on reports',
            'Multi-location analytics',
            'Bulk data import suite',
            'REST API access (10k calls/day)',
            'SSO (Google / Azure AD)',
            'Priority support with SLA',
          ],
        },
        {
          id: 'ENTERPRISE',
          name: 'Docita Enterprise',
          description:
            'Hospital-grade solution with custom contracts and unlimited scale.',
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
            'Unlimited patients, users & branches',
            'Everything in Clinic',
            'Data warehouse export (BI tools)',
            'Custom contract & invoicing',
            'Dedicated account manager',
            'Custom SLA guarantee',
          ],
        },
      ],
      addOns: [],
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
    } = params;

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

    const patientOverage =
      Math.max(0, patients - limits.patients) * overageRates.patientRate;
    const appointmentOverage =
      Math.max(0, appointments - (limits.appointments || 999999)) *
      overageRates.appointmentRate;
    const userOverage =
      Math.max(0, users - (limits.users || 1)) * overageRates.userRate;

    const totalOverage = patientOverage + appointmentOverage + userOverage;

    let discount = 0;
    if (billingCycle === 'yearly') {
      discount = ANNUAL_DISCOUNT_PERCENT;
    } else if (billingCycle === 'semi_annual') {
      discount = SEMI_ANNUAL_DISCOUNT_PERCENT;
    }

    const subtotal = basePrice;
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
        addOns: {},
        addOnTotal: 0,
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
