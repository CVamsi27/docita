import { tierSchema } from "@workspace/types";
import { getTierValue, Tier } from "./tier-access";

/**
 * Single source of truth for "what plan is the customer on" (billing truth,
 * derived from the active subscription). This is DISTINCT from the access tier
 * used for feature gating: while a trial is active the subscribed tier wins, so
 * an Essential trial reads as Essential everywhere (billing page, sidebar badge,
 * plan grid). Once the trial expires we defer to the access tier so the
 * downgrade is reflected honestly.
 *
 * Use this for any "current plan" display. Use the access tier (`currentTier`)
 * only for gating.
 */
export function resolveCurrentPlanTier(params: {
  subscriptionTier: string | null | undefined;
  isTrialExpired: boolean;
  accessTier: Tier;
}): Tier {
  const parsed = tierSchema.safeParse(params.subscriptionTier);
  if (parsed.success && !params.isTrialExpired) return getTierValue(parsed.data);
  return params.accessTier;
}
