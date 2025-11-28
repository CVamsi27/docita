/**
 * Tier Configuration - Frontend
 * 
 * This file provides tier configuration data with fallback values.
 * The actual source of truth is the backend API (/subscription/config).
 * 
 * Use the useTierConfig() hook from tier-config-context.tsx for dynamic values
 * that refresh from the backend.
 * 
 * The static exports below are fallback values used during loading or if
 * the API is unavailable.
 */

// Re-export everything from @workspace/types for convenience
export {
  Tier,
  Feature,
  FEATURE_TIER_MAP,
  TIER_INFO,
  TIER_PRICING,
  TIER_LIMITS,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  INTELLIGENCE_ADDONS,
  INTELLIGENCE_BUNDLE_DISCOUNT,
  getFeaturesForTier,
  getAllFeaturesUpToTier,
  getIntelligenceBundlePrice,
  hasFeatureAccess,
  getTierValue,
  getTierName,
  getTierInfo,
  getTierPricing,
  getTierLimits,
  getTierFeaturesList,
  type TierName,
  type TierPricing,
  type TierLimits,
  type TierInfo,
  type FeatureDisplay,
  type IntelligenceAddon,
} from '@workspace/types'

// Additional frontend-specific types and utilities

import { 
  Tier, 
  Feature, 
  FEATURE_TIER_MAP,
  TIER_LIMITS,
  TIER_PRICING,
  FEATURE_DISPLAY,
  getFeaturesForTier,
  getAllFeaturesUpToTier,
} from '@workspace/types'

/**
 * Plan pricing configuration (alias for frontend compatibility)
 */
export interface PlanPricing {
  monthly: number | 'custom'
  yearly: number | 'custom'
  currency: string
}

export const PLAN_PRICING = TIER_PRICING

/**
 * Plan limits configuration (alias for frontend compatibility)
 */
export interface PlanLimits {
  patients: number
  doctors: number
  storageGB: number
  branches: number
}

export const PLAN_LIMITS = TIER_LIMITS

/**
 * Plan descriptions (fallback values)
 */
export const PLAN_DESCRIPTIONS: Record<Tier, { tagline: string; description: string }> = {
  [Tier.CAPTURE]: {
    tagline: 'Free forever',
    description: 'Perfect for getting started with digitization'
  },
  [Tier.CORE]: {
    tagline: 'Solo Clinic Essentials',
    description: 'Essential features for small clinics'
  },
  [Tier.PLUS]: {
    tagline: 'WhatsApp Automation',
    description: 'Advanced features for growing clinics'
  },
  [Tier.PRO]: {
    tagline: 'Multi-Doctor Clinics',
    description: 'Full-featured solution for professional clinics'
  },
  [Tier.ENTERPRISE]: {
    tagline: 'Hospital-Grade System',
    description: 'Hospital-grade solution with full customization'
  },
  [Tier.INTELLIGENCE]: {
    tagline: 'AI-Powered Add-on',
    description: 'Enhance your clinic with AI-powered features'
  },
}

/**
 * Feature comparison row for subscription table
 */
export interface FeatureComparisonRow {
  name: string
  category: 'limit' | 'feature'
  values: Record<Tier, string | boolean | number>
}

/**
 * Generate feature comparison data from single source of truth
 */
export function getFeatureComparisonData(): FeatureComparisonRow[] {
  const tiers = [Tier.CAPTURE, Tier.CORE, Tier.PLUS, Tier.PRO, Tier.ENTERPRISE]
  
  const rows: FeatureComparisonRow[] = [
    // Limits
    {
      name: 'Patient Limit',
      category: 'limit',
      values: Object.fromEntries(
        tiers.map(t => [t, PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].patients === 999999 ? 'Unlimited' : PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].patients.toLocaleString()])
      ) as Record<Tier, string>
    },
    {
      name: 'Doctors',
      category: 'limit',
      values: Object.fromEntries(
        tiers.map(t => [t, PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].doctors === 999 ? 'Unlimited' : PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].doctors])
      ) as Record<Tier, string | number>
    },
    {
      name: 'Storage',
      category: 'limit',
      values: Object.fromEntries(
        tiers.map(t => [t, `${PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].storageGB} GB`])
      ) as Record<Tier, string>
    },
    {
      name: 'Branches',
      category: 'limit',
      values: Object.fromEntries(
        tiers.map(t => [t, PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].branches === 999 ? 'Unlimited' : PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].branches])
      ) as Record<Tier, string | number>
    },
    // Core Features
    {
      name: 'Prescriptions',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => [t, t >= FEATURE_TIER_MAP[Feature.DIGITAL_PRESCRIPTIONS]])
      ) as Record<Tier, boolean>
    },
    {
      name: 'Appointments',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => [t, t >= FEATURE_TIER_MAP[Feature.CALENDAR_SLOTS]])
      ) as Record<Tier, boolean>
    },
    {
      name: 'WhatsApp',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => {
          if (t >= FEATURE_TIER_MAP[Feature.WHATSAPP_API]) return [t, 'Full']
          if (t >= FEATURE_TIER_MAP[Feature.ONE_WAY_WHATSAPP]) return [t, 'Basic']
          return [t, false]
        })
      ) as Record<Tier, string | boolean>
    },
    {
      name: 'OCR Scanning',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => {
          if (t >= FEATURE_TIER_MAP[Feature.OCR_ADVANCED]) return [t, 'Advanced']
          if (t >= FEATURE_TIER_MAP[Feature.OCR_BASIC]) return [t, 'Basic']
          return [t, false]
        })
      ) as Record<Tier, string | boolean>
    },
    {
      name: 'Analytics',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => {
          if (t >= FEATURE_TIER_MAP[Feature.ADVANCED_ANALYTICS]) return [t, 'Advanced']
          if (t >= FEATURE_TIER_MAP[Feature.BASIC_ANALYTICS]) return [t, 'Basic']
          return [t, false]
        })
      ) as Record<Tier, string | boolean>
    },
    {
      name: 'API Access',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => [t, t >= FEATURE_TIER_MAP[Feature.API_ACCESS]])
      ) as Record<Tier, boolean>
    },
    {
      name: 'Multi-branch',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => [t, t >= FEATURE_TIER_MAP[Feature.MULTI_CLINIC]])
      ) as Record<Tier, boolean>
    },
    {
      name: 'Inventory',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => [t, t >= FEATURE_TIER_MAP[Feature.INVENTORY]])
      ) as Record<Tier, boolean>
    },
    {
      name: 'Lab Tests',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => [t, t >= FEATURE_TIER_MAP[Feature.LAB_TESTS]])
      ) as Record<Tier, boolean>
    },
    {
      name: 'Queue Management',
      category: 'feature',
      values: Object.fromEntries(
        tiers.map(t => [t, t >= FEATURE_TIER_MAP[Feature.QUEUE_MANAGEMENT]])
      ) as Record<Tier, boolean>
    },
  ]

  return rows
}

/**
 * Get highlighted features for each plan (for plan cards)
 */
export function getPlanHighlights(tier: Tier): { name: string; included: boolean; highlight?: boolean }[] {
  const tierName = Tier[tier] as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[tierName]
  const features: { name: string; included: boolean; highlight?: boolean }[] = []

  // Add limits
  features.push({
    name: limits.patients === 999999 ? 'Unlimited patients' : `Up to ${limits.patients.toLocaleString()} patients`,
    included: true
  })

  features.push({
    name: limits.doctors === 999 ? 'Unlimited doctors' : limits.doctors === 1 ? 'Single doctor' : `Up to ${limits.doctors} doctors`,
    included: true
  })

  // Add tier-specific highlights
  const tierFeatures = getFeaturesForTier(tierName)
  const highlightFeatures = tierFeatures.slice(0, 3)
  
  highlightFeatures.forEach(feature => {
    features.push({
      name: FEATURE_DISPLAY[feature].name,
      included: true,
      highlight: true
    })
  })

  // Add some features from previous tiers as included
  if (tier > Tier.CAPTURE) {
    const prevTierName = Tier[tier - 1] as keyof typeof PLAN_LIMITS
    const previousFeatures = getAllFeaturesUpToTier(prevTierName)
    previousFeatures.slice(0, 2).forEach(feature => {
      features.push({
        name: FEATURE_DISPLAY[feature].name,
        included: true
      })
    })
  }

  // Add upcoming tier features as not included
  if (tier < Tier.ENTERPRISE) {
    const nextTierName = Tier[tier + 1] as keyof typeof PLAN_LIMITS
    const nextTierFeatures = getFeaturesForTier(nextTierName)
    nextTierFeatures.slice(0, 2).forEach(feature => {
      features.push({
        name: FEATURE_DISPLAY[feature].name,
        included: false
      })
    })
  }

  return features.slice(0, 8) // Limit to 8 features for display
}
