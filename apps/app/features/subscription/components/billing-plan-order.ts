import { Tier } from "@/lib/subscription/tier-access";

export const PLAN_ORDER = [
  Tier.STARTER,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.HOSPITAL,
  Tier.ENTERPRISE,
] as const;
