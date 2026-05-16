import type { CurrentUsage, TierInfo } from "@workspace/types";
import { formatCountLocale } from "@workspace/utils";

export interface CurrentPlanCardProps {
  tierInfo: TierInfo;
  currentTier: number;
  hasIntelligence: boolean;
  canChangeTier: boolean;
  onChangePlan: () => void;
  onViewBillingHistory: () => void;
  /**
   * Render a banner for a scheduled plan change (e.g. "Downgrades to
   * Essential on Dec 1") with an Undo action.
   */
  scheduledChange?: {
    planName: string;
    effectiveAt: string;
    onCancel: () => void;
    isCancelling?: boolean;
  } | null;
  /**
   * Show the account credit balance the user has accumulated (held credit
   * is applied against the next invoice).
   */
  accountCreditCents?: number;
  accountCreditCurrency?: string;
  /**
   * Pay for the next billing cycle immediately (renew current plan).
   * Only rendered when provided AND the plan is renewable (paid tier).
   */
  onRenewNow?: () => void;
  /** Label override for the renew CTA, e.g. "Add payment method" when trialing. */
  renewActionLabel?: string;
  /** Shows the renew button with prominent styling (e.g. renewal imminent). */
  emphasizeRenew?: boolean;
  /** Disable renew while a checkout request is in flight. */
  isRenewProcessing?: boolean;
  planDetails?: { label: string; value: string }[];
  /** Optional note under the plan detail strip. */
  planDetailsFootnote?: string;
  usage?: CurrentUsage | null;
  isUsageLoading?: boolean;
  hasUsageError?: boolean;
  statusNotice?: {
    title: string;
    description: string;
    badgeLabel?: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: "default" | "warning" | "destructive";
  };
  /** When false, hides the WhatsApp usage row (e.g. Starter has no patient WhatsApp feature). */
  showWhatsAppUsageMeter?: boolean;
}

export const TIER_COLOR_MAP: Record<string, { gradient: string; badge: string }> = {
  gray: {
    gradient: "tier-capture",
    badge: "tier-capture",
  },
  blue: {
    gradient: "tier-core",
    badge: "tier-core",
  },
  green: {
    gradient: "tier-plus",
    badge: "tier-plus",
  },
  purple: {
    gradient: "tier-pro",
    badge: "tier-pro",
  },
  orange: {
    gradient: "tier-enterprise",
    badge: "tier-enterprise",
  },
};

export const USAGE_ITEMS = [
  { key: "consultations", label: "Consultations", unit: "consults" },
  { key: "users", label: "Team members", unit: "users" },
  { key: "whatsappMessages", label: "WhatsApp", unit: "msgs" },
] as const;

export function formatUsageValue(value: number) {
  return value >= 999999 ? "Unlimited" : formatCountLocale(value);
}
