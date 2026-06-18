import {
  PUBLISHED_PLAN_LADDER,
  TIER_LIMITS,
  type TierName,
} from "@workspace/types";

export interface TeamSizeTierRecommendation {
  tier: TierName;
  includedUsers: number;
  totalUsers: number;
}

/**
 * Smallest published plan whose included user seats cover the team size (owner + invites).
 */
export function recommendTierForTeamSize(
  totalUsers: number,
): TeamSizeTierRecommendation | null {
  if (!Number.isFinite(totalUsers) || totalUsers < 1) {
    return null;
  }

  const normalized = Math.ceil(totalUsers);

  for (const tier of PUBLISHED_PLAN_LADDER) {
    const includedUsers = TIER_LIMITS[tier]?.users ?? 0;
    if (includedUsers >= normalized) {
      return { tier, includedUsers, totalUsers: normalized };
    }
  }

  return null;
}
