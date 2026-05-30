import {
  getAiCreditAllotment,
  PUBLISHED_PLAN_LADDER,
  publishedPlanLadderIndex,
  TIER_LIMITS,
  WHATSAPP_ADDON_PRICING,
  type CurrentUsage,
  type TierName,
} from "@workspace/types";

/**
 * Tier ladder used for "next plan" suggestions. Excludes INTELLIGENCE (add-on).
 * Order matches the published plan ladder, not the numeric Tier enum.
 */
type WhatsappPricingTier = Exclude<TierName, "STARTER" | "INTELLIGENCE">;

function isWhatsappPricingTier(tier: TierName): tier is WhatsappPricingTier {
  return tier !== "STARTER" && tier !== "INTELLIGENCE";
}

function readWhatsappIncludedQuota(tier: TierName): number {
  if (!isWhatsappPricingTier(tier)) {
    return 0;
  }
  return WHATSAPP_ADDON_PRICING[tier]?.includedQuota ?? 0;
}

export interface TierRecommendation {
  tier: TierName;
  reasons: string[];
}

/**
 * Suggest the smallest tier whose included quotas comfortably cover current usage.
 * Returns null when the active tier already covers usage with headroom or usage is missing.
 */
export function recommendTier(
  current: TierName,
  usage: CurrentUsage | null | undefined,
): TierRecommendation | null {
  if (!usage) return null;
  const currentIdx = publishedPlanLadderIndex(current);
  if (currentIdx < 0) return null;

  const consultations = usage.usage.consultations;
  const users = usage.usage.users;
  const whatsapp = usage.usage.whatsappMessages;
  const aiCredits = usage.usage.aiCredits;

  for (let i = currentIdx + 1; i < PUBLISHED_PLAN_LADDER.length; i += 1) {
    const candidate = PUBLISHED_PLAN_LADDER[i];
    if (!candidate) continue;
    const limits = TIER_LIMITS[candidate];
    const includedAppointments = limits.appointments ?? 0;
    const includedUsers = limits.users ?? 0;
    const includedWhatsapp = readWhatsappIncludedQuota(candidate);
    const includedAiCredits = getAiCreditAllotment(candidate) ?? Number.MAX_SAFE_INTEGER;

    const covers =
      consultations <= includedAppointments &&
      users <= includedUsers &&
      whatsapp <= includedWhatsapp &&
      aiCredits <= includedAiCredits;
    if (!covers) continue;

    const reasons: string[] = [];
    const currentLimits = TIER_LIMITS[current];
    if (consultations > (currentLimits.appointments ?? 0)) {
      reasons.push(
        `${consultations} consultations this period vs ${currentLimits.appointments ?? 0} included on ${current}`,
      );
    }
    if (users > (currentLimits.users ?? 0)) {
      reasons.push(
        `${users} active users vs ${currentLimits.users ?? 0} included on ${current}`,
      );
    }
    const currentWa = readWhatsappIncludedQuota(current);
    if (whatsapp > currentWa) {
      reasons.push(
        `${whatsapp} WhatsApp messages vs ${currentWa} included on ${current}`,
      );
    }
    const currentAiCredits = getAiCreditAllotment(current);
    if (
      currentAiCredits !== null &&
      aiCredits > currentAiCredits
    ) {
      reasons.push(
        `${aiCredits} AI credits vs ${currentAiCredits} included on ${current}`,
      );
    }
    if (reasons.length === 0) return null;
    return { tier: candidate, reasons };
  }
  return null;
}
