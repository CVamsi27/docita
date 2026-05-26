import {
  Building2,
  ClipboardList,
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
  FRONT_DESK: ClipboardList,
  FRONT_DESK_CLINIC: ClipboardList,
  FRONT_DESK_HOSPITAL: ClipboardList,
  PROFESSIONAL: Crown,
  HOSPITAL: Hospital,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

export const PLAN_TIER_RANK: Record<TierName, number> = {
  STARTER: 10,
  FRONT_DESK: 18,
  FRONT_DESK_CLINIC: 19,
  FRONT_DESK_HOSPITAL: 20,
  ESSENTIAL: 30,
  PROFESSIONAL: 40,
  HOSPITAL: 50,
  ENTERPRISE: 60,
  INTELLIGENCE: 55,
};
