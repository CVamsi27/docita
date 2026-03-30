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
          const canonicalTier =
            (DB_TIER_TO_CANONICAL[tier.tier as string] ?? tier.tier) as keyof typeof TIER_LIMITS;
          const tierDefaults = TIER_LIMITS[canonicalTier];
          const tierRateDefaults =
            TIER_OVERAGE_RATES_BY_CURRENCY[validCurrency][canonicalTier];

          return {
            id: canonicalTier,
            name: TIER_INFO[canonicalTier].name,
            description: TIER_INFO[canonicalTier].description,
            tagline: TIER_INFO[canonicalTier].tagline,
            color: TIER_INFO[canonicalTier].color,
            pricing: {
              monthly: tier.monthlyBasePriceCents / 100,
              yearly: deriveAnnualPrice(tier.monthlyBasePriceCents / 100),
              currency: currencyConfig.symbol,
            },
            limits: {
              patients: tier.includedPatients,
              appointments: tier.includedAppointments,
              storage: tier.includedStorageGB,
              users: tier.includedUsers,
              doctors: tierDefaults.doctors,
              branches: tierDefaults.branches,
              prescriptions: tierDefaults.prescriptions,
              invoices: tierDefaults.invoices,
            },
          overageRates: {
            patient: tier.overagePatientCents / 100,
            appointment: tier.overageAppointmentCents / 100,
            storage: tier.overageStorageCents / 100,
            user: tier.overageUserCents / 100,
              prescription: tierRateDefaults.prescriptionRate,
              invoice: tierRateDefaults.invoiceRate,
            },
            features: this.parseJsonValue(tier.features),
          };
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
          id: 'STARTER',
          name: 'Free',
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
            'Consultation scheduling',
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
          name: 'Essential',
          description:
            'Clear limits, WhatsApp messaging, and simple billing.',
          tagline: 'For solo clinics',
          color: 'blue',
          pricing: {
            monthly: tierPricing.ESSENTIAL.monthly,
            yearly: tierPricing.ESSENTIAL.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.ESSENTIAL,
          overageRates: overageRates.ESSENTIAL,
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
        },
        {
          id: 'PROFESSIONAL',
          name: 'Professional',
          description:
            'Multi-doctor clinics with advanced workflows.',
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
        },
        {
          id: 'ENTERPRISE',
          name: 'Enterprise',
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
            'Everything in Professional',
            'Data warehouse export (BI tools)',
            'Custom contract & invoicing',
            'Dedicated account manager',
            'Custom SLA guarantee',
          ],
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
    patients?: number;
    appointments?: number;
    users?: number;
    prescriptions?: number;
    invoices?: number;
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
      prescriptions = 0,
      invoices = 0,
      whatsappMessages = 0,
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
    const prescriptionOverage =
      Math.max(0, prescriptions - (limits.prescriptions || 0)) *
      overageRates.prescriptionRate;
    const invoiceOverage =
      Math.max(0, invoices - (limits.invoices || 0)) *
      overageRates.invoiceRate;
    const whatsappPricing =
      tierKey === 'ESSENTIAL' || tierKey === 'PROFESSIONAL'
        ? getWhatsAppAddonPricingByCurrency(
            tierKey,
            validCurrency,
          )
        : null;
    const whatsappOverage =
      whatsappPricing && whatsappMessages > whatsappPricing.includedQuota
        ? (whatsappMessages - whatsappPricing.includedQuota) *
          whatsappPricing.overageRate
        : 0;

    const totalOverage =
      patientOverage +
      appointmentOverage +
      userOverage +
      prescriptionOverage +
      invoiceOverage +
      whatsappOverage;

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
      Math.round((annualBase + totalOverage * 12) * roundFactor) /
      roundFactor;

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
          prescriptions: {
            count: Math.max(0, prescriptions - (limits.prescriptions || 0)),
            charge: prescriptionOverage,
          },
          invoices: {
            count: Math.max(0, invoices - (limits.invoices || 0)),
            charge: invoiceOverage,
          },
          whatsappMessages: {
            count:
              whatsappPricing && whatsappMessages > whatsappPricing.includedQuota
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
