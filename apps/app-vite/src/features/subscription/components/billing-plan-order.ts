export const PLAN_ORDER = [
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
  "ENTERPRISE",
] as const;

export type PlanOrderTier = (typeof PLAN_ORDER)[number];
