import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TIER_PRICING,
  TIER_LIMITS,
  TIER_OVERAGE_RATES,
  WHATSAPP_ADDON_PRICING,
  INTELLIGENCE_ADDON_PRICING,
  DISCOUNT_CONFIG,
  REFERRAL_REWARDS,
  AI_CREDIT_COSTS,
  ANNUAL_DISCOUNT_PERCENT,
  SEMI_ANNUAL_DISCOUNT_PERCENT,
  TIER_PRICING_BY_CURRENCY,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  WHATSAPP_ADDON_PRICING_BY_CURRENCY,
  INTELLIGENCE_ADDON_PRICING_BY_CURRENCY,
  REFERRAL_REWARDS_BY_CURRENCY,
  PRICING_CURRENCY_CONFIG,
  SupportedCurrency,
} from '@workspace/types';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get complete pricing configuration
   */
  async getPricingConfig(currency?: string) {
    const selectedCurrency =
      (currency?.toUpperCase() as SupportedCurrency) || 'INR';
    const validCurrency = ['INR', 'USD', 'EUR', 'GBP', 'AUD'].includes(
      selectedCurrency,
    )
      ? selectedCurrency
      : 'INR';

    const currencyConfig = PRICING_CURRENCY_CONFIG[validCurrency];
    const tierPricing = TIER_PRICING_BY_CURRENCY[validCurrency];
    const overageRates = TIER_OVERAGE_RATES_BY_CURRENCY[validCurrency];
    const whatsappPricing = WHATSAPP_ADDON_PRICING_BY_CURRENCY[validCurrency];
    const intelligencePricing =
      INTELLIGENCE_ADDON_PRICING_BY_CURRENCY[validCurrency];
    const referralRewards = REFERRAL_REWARDS_BY_CURRENCY[validCurrency];

    // Try to get from database first (for runtime updates)
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

    // If database has data, use it; otherwise fall back to constants
    if (dbTiers.length > 0) {
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
        tiers: dbTiers.map((tier) => ({
          id: tier.tier,
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
          features: JSON.parse(tier.features as string),
        })),
        addOns: dbAddOns.map((addOn) => ({
          id: addOn.type,
          name: addOn.name,
          description: addOn.description,
          icon: addOn.icon,
          pricingByTier: JSON.parse(addOn.pricingByTier as string),
          includedQuotaByTier: JSON.parse(addOn.includedQuotaByTier as string),
          overageRateByTier: JSON.parse(addOn.overageRateByTier as string),
          features: JSON.parse(addOn.features as string),
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

    // Fall back to constants with selected currency
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
          id: 'CAPTURE',
          name: 'Capture',
          description: 'Paper-to-digital bridge for solo practitioners',
          tagline: 'Free forever',
          color: 'gray',
          pricing: {
            monthly: tierPricing.CAPTURE.monthly,
            yearly: tierPricing.CAPTURE.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.CAPTURE,
          overageRates: overageRates.CAPTURE,
          features: [
            'Up to 50 patients',
            'Basic patient records',
            'Excel/PDF import',
            'Manual data export',
            'Community support',
          ],
        },
        {
          id: 'CORE',
          name: 'Core',
          description: 'Full-function EHR for individual practitioners',
          tagline: 'Solo Clinic Essentials',
          color: 'blue',
          pricing: {
            monthly: tierPricing.CORE.monthly,
            yearly: tierPricing.CORE.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.CORE,
          overageRates: overageRates.CORE,
          features: [
            '300 active patients included',
            '500 appointments/month',
            'Calendar & scheduling',
            'Digital prescriptions',
            'ICD-10 medical coding',
            'Basic analytics',
            'Email support',
          ],
        },
        {
          id: 'PLUS',
          name: 'Plus',
          description: 'Scale & customize for growing practices',
          tagline: 'Growth Ready',
          color: 'green',
          pricing: {
            monthly: tierPricing.PLUS.monthly,
            yearly: tierPricing.PLUS.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.PLUS,
          overageRates: overageRates.PLUS,
          features: [
            '1,000 active patients included',
            '2,000 appointments/month',
            'Everything in Core',
            'Prescription templates',
            'Custom form fields',
            'Clinic branding',
            'Priority email support',
            '2 users included',
          ],
        },
        {
          id: 'PRO',
          name: 'Pro',
          description: 'Multi-doctor clinics with advanced needs',
          tagline: 'Multi-Doctor Clinics',
          color: 'purple',
          pricing: {
            monthly: tierPricing.PRO.monthly,
            yearly: tierPricing.PRO.yearly,
            currency: currencyConfig.symbol,
          },
          limits: TIER_LIMITS.PRO,
          overageRates: overageRates.PRO,
          features: [
            '5,000 active patients included',
            '8,000 appointments/month',
            'Everything in Plus',
            'Up to 5 doctors included',
            'Advanced analytics',
            'Revenue reports',
            'API access',
            'Phone support',
          ],
        },
        {
          id: 'ENTERPRISE',
          name: 'Enterprise',
          description: 'Hospitals & clinic chains - Contact Sales',
          tagline: 'Hospital-Grade',
          color: 'amber',
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
            'Everything in Pro',
            'Unlimited doctors & branches',
            'Custom integrations',
            'Dedicated account manager',
            'SLA guarantee (99.9%)',
            'On-premise option',
          ],
        },
      ],
      addOns: {
        whatsapp: {
          id: 'WHATSAPP',
          name: 'WhatsApp Integration',
          description: 'Automated patient communication via WhatsApp',
          icon: 'MessageSquare',
          pricingByTier: whatsappPricing,
          features: [
            'Appointment reminders',
            'Prescription sharing',
            'Follow-up notifications',
            'Birthday/wellness messages',
            'Two-way messaging',
            'Message templates',
            'Delivery reports',
          ],
        },
        intelligence: {
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
      },
      discounts: DISCOUNT_CONFIG,
      referralRewards: referralRewards,
      discountPercents: {
        annual: ANNUAL_DISCOUNT_PERCENT,
        semiAnnual: SEMI_ANNUAL_DISCOUNT_PERCENT,
      },
    };
  }

  /**
   * Calculate estimated price for a configuration
   */
  calculateEstimate(params: {
    tier: string;
    currency?: string;
    billingCycle?: string;
    patients?: string;
    appointments?: string;
    users?: string;
    whatsapp?: string;
    whatsappMessages?: string;
    intelligence?: string;
    aiCredits?: string;
  }) {
    const {
      tier,
      currency,
      billingCycle = 'monthly',
      patients,
      appointments,
      users,
      whatsapp,
      whatsappMessages,
      intelligence,
      aiCredits,
    } = params;

    const selectedCurrency =
      (currency?.toUpperCase() as SupportedCurrency) || 'INR';
    const validCurrency = ['INR', 'USD', 'EUR', 'GBP', 'AUD'].includes(
      selectedCurrency,
    )
      ? selectedCurrency
      : 'INR';

    const currencyConfig = PRICING_CURRENCY_CONFIG[validCurrency];
    const tierPricing = TIER_PRICING_BY_CURRENCY[validCurrency];
    const tierOverageRates = TIER_OVERAGE_RATES_BY_CURRENCY[validCurrency];
    const whatsappPricing = WHATSAPP_ADDON_PRICING_BY_CURRENCY[validCurrency];
    const intelligencePricing =
      INTELLIGENCE_ADDON_PRICING_BY_CURRENCY[validCurrency];

    const tierKey = tier.toUpperCase() as keyof typeof TIER_PRICING;
    if (!TIER_PRICING[tierKey] || tierKey === 'INTELLIGENCE') {
      return { error: 'Invalid tier' };
    }

    const pricing = tierPricing[tierKey];
    const limits = TIER_LIMITS[tierKey];
    const overageRates = tierOverageRates[tierKey];

    // Enterprise is custom pricing
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

    const basePrice = pricing.monthly as number;

    // Calculate overages
    const patientCount = parseInt(patients || '0') || 0;
    const appointmentCount = parseInt(appointments || '0') || 0;
    const userCount = parseInt(users || '0') || 1;

    const patientOverage =
      Math.max(0, patientCount - limits.patients) * overageRates.patientRate;
    const appointmentOverage =
      Math.max(0, appointmentCount - (limits.appointments || 999999)) *
      overageRates.appointmentRate;
    const userOverage =
      Math.max(0, userCount - (limits.users || 1)) * overageRates.userRate;

    let totalOverage = patientOverage + appointmentOverage + userOverage;

    // Add-on costs
    let addOnCosts = 0;
    const addOnsBreakdown: Record<string, { base: number; overage: number }> =
      {};

    // WhatsApp add-on
    if (whatsapp === 'true' && tierKey !== 'CAPTURE') {
      const waPrice = whatsappPricing[tierKey as keyof typeof whatsappPricing];
      const waBase = waPrice.basePrice as number;
      const messageCount = parseInt(whatsappMessages || '0') || 0;
      const waOverage =
        Math.max(0, messageCount - waPrice.includedQuota) * waPrice.overageRate;

      addOnCosts += waBase;
      totalOverage += waOverage;
      addOnsBreakdown.whatsapp = { base: waBase, overage: waOverage };
    }

    // Intelligence add-on
    if (intelligence === 'true' && tierKey !== 'CAPTURE') {
      const aiPrice =
        intelligencePricing[tierKey as keyof typeof intelligencePricing];
      const aiBase = aiPrice.basePrice as number;
      const creditCount = parseInt(aiCredits || '0') || 0;
      const aiOverage =
        Math.max(0, creditCount - aiPrice.includedQuota) * aiPrice.overageRate;

      addOnCosts += aiBase;
      totalOverage += aiOverage;
      addOnsBreakdown.intelligence = { base: aiBase, overage: aiOverage };
    }

    // Apply billing cycle discount
    let discount = 0;
    if (billingCycle === 'yearly') {
      discount = ANNUAL_DISCOUNT_PERCENT;
    } else if (billingCycle === 'semi_annual') {
      discount = SEMI_ANNUAL_DISCOUNT_PERCENT;
    }

    const subtotal = basePrice + addOnCosts;
    const discountAmount = subtotal * (discount / 100);
    const totalMonthly = subtotal - discountAmount + totalOverage;

    // Round based on currency decimal places
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
            count: Math.max(0, patientCount - limits.patients),
            charge: patientOverage,
          },
          appointments: {
            count: Math.max(
              0,
              appointmentCount - (limits.appointments || 999999),
            ),
            charge: appointmentOverage,
          },
          users: {
            count: Math.max(0, userCount - (limits.users || 1)),
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
