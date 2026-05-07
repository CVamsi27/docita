import {
  TIER_LIMITS,
  WHATSAPP_ADDON_PRICING,
  type CurrentUsage,
  type TierName,
} from "@workspace/types";

/**
 * Tier ladder used for "next plan" suggestions. Excludes INTELLIGENCE (add-on).
 * Order matches the published plan ladder, not the numeric Tier enum.
 */
const RECOMMENDER_LADDER: TierName[] = [
  "STARTER",
  "FRONT_DESK",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
  "ENTERPRISE",
];

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
  const currentIdx = RECOMMENDER_LADDER.indexOf(current);
  if (currentIdx < 0) return null;

  const consultations = usage.usage.consultations;
  const users = usage.usage.users;
  const whatsapp = usage.usage.whatsappMessages;

  for (let i = currentIdx + 1; i < RECOMMENDER_LADDER.length; i += 1) {
    const candidate = RECOMMENDER_LADDER[i];
    if (!candidate) continue;
    const limits = TIER_LIMITS[candidate];
    const includedAppointments = limits.appointments ?? 0;
    const includedUsers = limits.users ?? 0;
    const includedWhatsapp =
      candidate === "STARTER"
        ? 0
        : (WHATSAPP_ADDON_PRICING[
            candidate as Exclude<TierName, "STARTER" | "INTELLIGENCE">
          ]?.includedQuota ?? 0);

    const covers =
      consultations <= includedAppointments &&
      users <= includedUsers &&
      whatsapp <= includedWhatsapp;
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
    const currentWa =
      current === "STARTER"
        ? 0
        : (WHATSAPP_ADDON_PRICING[
            current as Exclude<TierName, "STARTER" | "INTELLIGENCE">
          ]?.includedQuota ?? 0);
    if (whatsapp > currentWa) {
      reasons.push(
        `${whatsapp} WhatsApp messages vs ${currentWa} included on ${current}`,
      );
    }
    if (reasons.length === 0) return null;
    return { tier: candidate, reasons };
  }
  return null;
}
