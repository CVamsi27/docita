import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Tier, Feature, FEATURE_TIER_MAP } from '../auth/tier.decorator';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import {
  TIER_PRICING,
  TIER_LIMITS,
  TIER_INFO,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  INTELLIGENCE_ADDONS,
  INTELLIGENCE_BUNDLE_DISCOUNT,
  WHATSAPP_ADDON_PRICING,
  TierName,
} from '@workspace/types';

// Re-export for backward compatibility
export {
  TIER_PRICING,
  TIER_LIMITS,
  TIER_INFO,
  FEATURE_DISPLAY,
  INTELLIGENCE_ADDONS,
  INTELLIGENCE_BUNDLE_DISCOUNT,
};

export const ANNUAL_DISCOUNT_PERCENT = 10;

// Intelligence features list
const INTELLIGENCE_FEATURES = [
  'AI prescription assistant',
  'Diagnosis suggestions (non-clinical)',
  'Smart task automation',
  'Predictive no-show model',
  'Patient risk segmentation',
  'Anomaly detection in analytics',
  'Voice-to-text dictation',
];

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the complete tier configuration
   * This is the single source of truth for all tier-related data
   */
  getTierConfig() {
    const tiers = ['CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE'];

    return {
      tiers: tiers.map((tier) => ({
        id: tier,
        tier: Tier[tier as keyof typeof Tier],
        ...TIER_INFO[tier as ClinicTier],
        pricing: TIER_PRICING[tier as ClinicTier],
        limits: TIER_LIMITS[tier as ClinicTier],
        features: TIER_FEATURES[tier as ClinicTier] || [],
      })),
      featureTierMap: FEATURE_TIER_MAP,
      featureDisplay: FEATURE_DISPLAY,
      intelligenceAddons: INTELLIGENCE_ADDONS,
      intelligenceBundleDiscount: INTELLIGENCE_BUNDLE_DISCOUNT,
      intelligenceInfo: {
        ...TIER_INFO['INTELLIGENCE'],
        pricing: TIER_PRICING['INTELLIGENCE'],
        features: INTELLIGENCE_FEATURES,
      },
      addOns: [
        {
          id: 'WHATSAPP',
          name: 'WhatsApp Integration',
          description: 'Connect with patients where they are most active',
          pricing: WHATSAPP_ADDON_PRICING as any, // Cast to any or helper if needed, Zod will validate shape
        },
      ],
    };
  }

  /**
   * Get subscription details for a clinic
   */
  async getSubscription(clinicId: string) {
    if (!clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        tier: true,
        intelligenceAddon: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        features: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const tierInfo = TIER_INFO[clinic.tier] || TIER_INFO['CAPTURE'];
    const tierFeatures = TIER_FEATURES[clinic.tier] || [];

    return {
      ...clinic,
      tierName: tierInfo.name,
      tierFeatures,
      intelligenceFeatures:
        clinic.intelligenceAddon === 'ACTIVE' ? INTELLIGENCE_FEATURES : [],
      isTrialing: clinic.subscriptionStatus === SubscriptionStatus.TRIALING,
      trialDaysRemaining: clinic.trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(clinic.trialEndsAt).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : null,
    };
  }

  /**
   * Check if a clinic has access to a specific feature
   */
  async hasFeatureAccess(clinicId: string, feature: Feature): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true,
        subscriptionStatus: true,
      },
    });

    if (!clinic) {
      return false;
    }

    // Check subscription status
    if (
      clinic.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      clinic.subscriptionStatus !== SubscriptionStatus.TRIALING
    ) {
      return false;
    }

    // Check custom feature overrides
    const featureOverrides = (clinic.features as Record<string, boolean>) || {};
    if (featureOverrides[feature] !== undefined) {
      return featureOverrides[feature];
    }

    // Map tier to enum
    const tierMap: Record<string, Tier> = {
      CAPTURE: Tier.CAPTURE,
      CORE: Tier.CORE,
      PLUS: Tier.PLUS,
      PRO: Tier.PRO,
      ENTERPRISE: Tier.ENTERPRISE,
    };

    const clinicTier = tierMap[clinic.tier] ?? Tier.CAPTURE;
    const requiredTier = FEATURE_TIER_MAP[feature];

    // Intelligence features require the add-on
    if (requiredTier === Tier.INTELLIGENCE) {
      return clinic.intelligenceAddon === 'ACTIVE';
    }

    return clinicTier >= requiredTier;
  }

  /**
   * Upgrade a clinic's tier
   */
  async upgradeTier(clinicId: string, newTier: string) {
    const validTiers = ['CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE'];

    if (!validTiers.includes(newTier)) {
      throw new BadRequestException(`Invalid tier: ${newTier}`);
    }

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier: newTier as ClinicTier,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /**
   * Enable/disable intelligence addon
   */
  async setIntelligenceAddon(clinicId: string, enabled: boolean) {
    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        intelligenceAddon: enabled ? 'ACTIVE' : 'NONE',
      },
    });
  }

  /**
   * Start a trial for a clinic
   * Default 30 days for "1st month free" promotion
   */
  async startTrial(clinicId: string, tier: string, daysLength: number = 30) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + daysLength);

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier: tier as ClinicTier,
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEndsAt,
      },
    });
  }

  /**
   * Override specific features for a clinic
   */
  async setFeatureOverrides(
    clinicId: string,
    overrides: Record<string, boolean>,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { features: true },
    });

    const existingFeatures =
      (clinic?.features as Record<string, boolean>) || {};
    const mergedFeatures = { ...existingFeatures, ...overrides };

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        features: mergedFeatures,
      },
    });
  }

  /**
   * Get all available tiers with their features
   */
  getAllTiers() {
    return Object.entries(TIER_INFO)
      .filter(([key]) => key !== 'INTELLIGENCE')
      .map(([key, info]) => ({
        id: key,
        name: info.name,
        features: TIER_FEATURES[key as ClinicTier] || [],
        pricing: TIER_PRICING[key as ClinicTier],
        limits: TIER_LIMITS[key as ClinicTier],
      }));
  }

  /**
   * Get intelligence addon info
   */
  getIntelligenceAddonInfo() {
    return {
      name: 'Docita Intelligence',
      description: 'AI-powered features to enhance your clinic workflow',
      features: INTELLIGENCE_FEATURES,
      addons: INTELLIGENCE_ADDONS,
      bundleDiscount: INTELLIGENCE_BUNDLE_DISCOUNT,
    };
  }
}
