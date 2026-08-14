import type { CurrentUsage, TierInfo } from "@workspace/types";
import { formatCountLocale } from "@workspace/utils";

export interface CurrentPlanCardProps {
  tierInfo: TierInfo;
  currentTier: number;
  hasIntelligence: boolean;
  canChangeTier: boolean;
  onChangePlan: () => void;
  onViewBillingHistory: () => void;
  scheduledChange?: {
    planName: string;
    effectiveAt: string;
    onCancel: () => void;
    isCancelling?: boolean;
  } | null;
  accountCreditCents?: number;
  accountCreditCurrency?: string;
  onRenewNow?: () => void;
  renewActionLabel?: string;
  emphasizeRenew?: boolean;
  isRenewProcessing?: boolean;
  planDetails?: { label: string; value: string }[];
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
  showWhatsAppUsageMeter?: boolean;
}

export const TIER_COLOR_MAP: Record<string, { gradient: string; badge: string }> = {
  gray: { gradient: "tier-capture", badge: "tier-capture" },
  blue: { gradient: "tier-core", badge: "tier-core" },
  green: { gradient: "tier-plus", badge: "tier-plus" },
  purple: { gradient: "tier-pro", badge: "tier-pro" },
  orange: { gradient: "tier-enterprise", badge: "tier-enterprise" },
};

export const USAGE_ITEMS = [
  { key: "consultations", label: "Consultations", unit: "consults" },
  { key: "users", label: "Team members", unit: "users" },
  { key: "whatsappMessages", label: "WhatsApp", unit: "msgs" },
] as const;

export function formatUsageValue(value: number) {
  return value >= 999999 ? "Unlimited" : formatCountLocale(value);
}
