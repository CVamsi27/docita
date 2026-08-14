import {
  Building2,
  Crown,
  Hospital,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import type { SupportedCurrency, Tier, TierName } from "@workspace/types";

export interface TierChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  selectedTier: TierName | null;
  billingCycle: "MONTHLY" | "YEARLY";
  currency: SupportedCurrency;
  onConfirm: () => Promise<void>;
  /** Schedule the downgrade for current-period-end (no charge today). */
  onSchedule?: () => Promise<void>;
  /** ISO timestamp of the current period end (renewal anchor for scheduled). */
  currentPeriodEnd?: string | null;
  /** True while Razorpay or billing API is in flight (parent checkout hook). */
  checkoutInFlight?: boolean;
}

export const TIER_ICONS: Record<TierName, React.ElementType> = {
  STARTER: Zap,
  ESSENTIAL: Rocket,
  PROFESSIONAL: Crown,
  HOSPITAL: Hospital,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

export const PLAN_TIER_RANK: Record<TierName, number> = {
  STARTER: 10,
  ESSENTIAL: 20,
  PROFESSIONAL: 30,
  HOSPITAL: 35,
  ENTERPRISE: 40,
  INTELLIGENCE: 36,
};
