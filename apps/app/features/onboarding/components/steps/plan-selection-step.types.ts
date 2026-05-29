export interface PlanSelectionProps {
  onSelect: (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: { currency?: string },
  ) => Promise<void>;
  defaultTier?: string;
  defaultBillingCycle?: "MONTHLY" | "YEARLY";
  currency?: string;
  /** Owner plus invited members saved on the previous onboarding step. */
  teamUserCount?: number;
  onBack?: () => void;
}
