import { tierSchema } from "@workspace/types";
import { getTierValue, type Tier } from "./tier-access";

export function resolveCurrentPlanTier(params: {
  subscriptionTier: string | null | undefined;
  isTrialExpired: boolean;
  accessTier: Tier;
}): Tier {
  const parsed = tierSchema.safeParse(params.subscriptionTier);
  if (parsed.success && !params.isTrialExpired) return getTierValue(parsed.data);
  return params.accessTier;
}
