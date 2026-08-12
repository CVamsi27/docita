import {
  Building2,
  ClipboardList,
  Crown,
  Hospital,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import { formatAmountLocale } from "@workspace/utils";

export interface TierCardProps {
  tier: number;
  info: { name: string; tagline?: string; description?: string; color?: string };
  features: { feature: string; details: { name: string; description: string }; hasAccess: boolean }[];
  isCurrentTier: boolean;
  isLocked: boolean;
  className?: string;
  pricing?: { monthly: number | "custom"; yearly: number | "custom" };
  billingCycle?: "MONTHLY" | "YEARLY";
  currencySymbol?: string;
  overageHint?: string;
  overageItems?: string[];
  buttonLabel?: string;
  maxDisplay?: number;
  usageHints?: { patients?: number; users?: number; whatsappMsgs?: number };
  bestFor?: string;
  includedLabel?: string;
  limitHighlights?: string[];
  featureDisplay?: "compact" | "detailed";
  showTopAccent?: boolean;
  keyHighlights?: string[];
  density?: "full" | "summary";
  isRecommended?: boolean;
}

export const TIER_ICONS: Record<string, React.ElementType> = {
  STARTER: Zap,
  ESSENTIAL: Rocket,
  FRONT_DESK: ClipboardList,
  PROFESSIONAL: Crown,
  HOSPITAL: Hospital,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

export const TIER_GRADIENTS: Record<string, { card: string; icon: string; badge: string; accent: string }> = {
  STARTER: { card: "from-card via-card to-muted/35", icon: "tier-capture", badge: "tier-capture", accent: "bg-muted-foreground" },
  ESSENTIAL: { card: "from-card via-card to-info/10", icon: "tier-core", badge: "tier-core", accent: "bg-info" },
  FRONT_DESK: { card: "from-card via-card to-info/10", icon: "tier-core", badge: "tier-core", accent: "bg-info" },
  PROFESSIONAL: { card: "from-card via-card to-primary/10", icon: "tier-pro", badge: "tier-pro", accent: "bg-primary" },
  HOSPITAL: { card: "from-card via-card to-info/10", icon: "tier-hospital", badge: "tier-hospital", accent: "bg-info" },
  ENTERPRISE: { card: "from-card via-card to-warning/10", icon: "tier-enterprise", badge: "tier-enterprise", accent: "bg-warning" },
  INTELLIGENCE: { card: "from-card via-card to-accent", icon: "bg-accent text-accent-foreground", badge: "tier-intelligence", accent: "bg-accent-foreground" },
};

export function formatTierPrice(
  tier: number,
  pricing: { monthly: number | "custom"; yearly: number | "custom" },
  billingCycle: "MONTHLY" | "YEARLY",
  sym = "",
): string {
  if (tier >= 4 || pricing.monthly === "custom" || pricing.yearly === "custom") return "Custom";
  if (billingCycle === "YEARLY" && typeof pricing.yearly === "number") return `${sym}${formatAmountLocale(pricing.yearly)}/yr`;
  if (typeof pricing.monthly === "number") return `From ${sym}${formatAmountLocale(pricing.monthly)}/mo`;
  return "Custom";
}
