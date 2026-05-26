import { PUBLISHED_PLAN_LADDER, type TierName } from "@workspace/types";
import {
	Building2,
	ClipboardList,
	Crown,
	Hospital,
	type LucideIcon,
	Rocket,
	Sparkles,
	Zap,
} from "lucide-react";

export const PRICING_ESTIMATE_DEBOUNCE_MS = 300;

/** Published billable plan ladder (same order as internal admin and onboarding). */
export const PRICING_DIALOG_TIERS: TierName[] = [...PUBLISHED_PLAN_LADDER];

/** Paid plans only — excludes Starter for usage-based estimator UX. */
export const PRICING_ESTIMATOR_TIERS: TierName[] = PUBLISHED_PLAN_LADDER.filter(
	(tier) => tier !== "STARTER",
);

export const PRICING_DIALOG_TIER_ICONS: Record<TierName, LucideIcon> = {
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

export const PRICING_DIALOG_TIER_GRADIENTS: Record<TierName, string> = {
	STARTER: "from-muted to-muted/60",
	ESSENTIAL: "from-info/20 to-info/10",
	FRONT_DESK: "from-info/15 to-info/8",
	FRONT_DESK_CLINIC: "from-info/15 to-info/8",
	FRONT_DESK_HOSPITAL: "from-info/15 to-info/8",
	PROFESSIONAL: "from-primary/20 to-primary/10",
	HOSPITAL: "from-info/20 to-info/10",
	ENTERPRISE: "from-warning/20 to-warning/10",
	INTELLIGENCE: "from-accent to-accent/70",
};

export const PRICING_DIALOG_TIER_BORDERS: Record<TierName, string> = {
	STARTER: "border-border hover:border-border/70",
	ESSENTIAL: "border-info/30 hover:border-info/50",
	FRONT_DESK: "border-info/25 hover:border-info/45",
	FRONT_DESK_CLINIC: "border-info/25 hover:border-info/45",
	FRONT_DESK_HOSPITAL: "border-info/25 hover:border-info/45",
	PROFESSIONAL: "border-primary/30 hover:border-primary/50",
	HOSPITAL: "border-info/30 hover:border-info/50",
	ENTERPRISE: "border-warning/30 hover:border-warning/50",
	INTELLIGENCE: "border-accent-foreground/20 hover:border-accent-foreground/35",
};

export const DEFAULT_PRICING_USAGE_INPUTS = {
	consultations: 400,
	users: 2,
	whatsappMessages: 500,
};
