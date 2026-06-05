import { Injectable, Inject } from '@nestjs/common';
import {
  TIER_PRICING_REPOSITORY_TOKEN,
  ITierPricingRepository,
} from '@/domains/billing/core/repositories/tier-pricing.repository';
import {
  TIER_PRICING,
  TIER_LIMITS,
  TIER_FEATURES,
  ANNUAL_DISCOUNT_PERCENT,
  SEMI_ANNUAL_DISCOUNT_PERCENT,
  TIER_PRICING_BY_CURRENCY,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  REFERRAL_REWARDS_BY_CURRENCY,
  PRICING_CURRENCY_CONFIG,
  PUBLISHED_PLAN_LADDER,
  SupportedCurrency,
} from '@workspace/types';
import {
  deriveAnnualPrice,
  getWhatsAppAddonPricingByCurrency,
} from '@workspace/utils';
import {
  isLegacyDbPricingTier,
  mapDbTierStringToCanonicalTier,
  mapPricingTierInputToTierName,
  readNumber,
  resolveCurrency,
  SUPPORTED_PRICING_CURRENCIES,
  toPricingTierPayload,
} from './pricing-helpers';

@Injectable()
export class PricingService {
  constructor(
    @Inject(TIER_PRICING_REPOSITORY_TOKEN)
    private readonly tierPricingRepo: ITierPricingRepository,
  ) {}

  private readonly supportedCurrencies = SUPPORTED_PRICING_CURRENCIES;

  private resolveCurrency(currency?: string): SupportedCurrency {
    return resolveCurrency(this.supportedCurrencies, currency);
  }

  private toPricingTierPayload(
    args: Parameters<typeof toPricingTierPayload>[0],
  ) {
    return toPricingTierPayload(args);
  }

  async getPricingConfig(currency?: string) {
    const validCurrency = this.resolveCurrency(currency);

    const currencyConfig = PRICING_CURRENCY_CONFIG[validCurrency];
    const tierPricing = TIER_PRICING_BY_CURRENCY[validCurrency];
    const referralRewards = REFERRAL_REWARDS_BY_CURRENCY[validCurrency];

    const dbTiers = await this.tierPricingRepo.findManyActive();

    if (dbTiers.length > 0) {
      const canonicalTiers = dbTiers.filter(
        (t) => !isLegacyDbPricingTier(t.tier),
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
          const canonicalTier = mapDbTierStringToCanonicalTier(tier.tier);
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
            features: tier.features,
          });
        }),
        discounts: {
          annualPercent: ANNUAL_DISCOUNT_PERCENT,
          semiAnnualPercent: SEMI_ANNUAL_DISCOUNT_PERCENT,
          referralCredits: referralRewards.ESSENTIAL,
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
      tiers: PUBLISHED_PLAN_LADDER.map((tier) =>
        this.toPricingTierPayload({
          tier,
          validCurrency,
          monthly: tierPricing[tier].monthly,
          yearly: tierPricing[tier].yearly,
          includedAppointments: TIER_LIMITS[tier].appointments ?? 0,
          includedUsers: TIER_LIMITS[tier].users ?? 1,
          features: TIER_FEATURES[tier],
        }),
      ),
      discounts: {
        annualPercent: ANNUAL_DISCOUNT_PERCENT,
        semiAnnualPercent: SEMI_ANNUAL_DISCOUNT_PERCENT,
        referralCredits: referralRewards.ESSENTIAL,
      },
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

    const tierKey = mapPricingTierInputToTierName(tier);

    if (!tierKey || !TIER_PRICING[tierKey]) {
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

    const basePrice = readNumber(pricing.monthly);

    const consultationOverage =
      Math.max(0, resolvedConsultations - (limits.appointments || 999999)) *
      overageRates.appointmentRate;
    const userOverage =
      Math.max(0, users - (limits.users || 1)) * overageRates.userRate;
    const whatsappPricing =
      tierKey !== 'STARTER' && tierKey !== 'INTELLIGENCE'
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
