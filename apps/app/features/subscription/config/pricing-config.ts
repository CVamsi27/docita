import { PUBLISHED_PLAN_LADDER, type TierName } from "@workspace/types";
import {
	Building2,
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
	PROFESSIONAL: Crown,
	HOSPITAL: Hospital,
	ENTERPRISE: Building2,
	INTELLIGENCE: Sparkles,
};

export const PRICING_DIALOG_TIER_GRADIENTS: Record<TierName, string> = {
	STARTER: "from-muted to-muted/60",
	ESSENTIAL: "from-info/20 to-info/10",
	PROFESSIONAL: "from-primary/20 to-primary/10",
	HOSPITAL: "from-info/20 to-info/10",
	ENTERPRISE: "from-warning/20 to-warning/10",
	INTELLIGENCE: "from-accent to-accent/70",
};

export const PRICING_DIALOG_TIER_BORDERS: Record<TierName, string> = {
	STARTER: "border-border hover:border-border/70",
	ESSENTIAL: "border-info/30 hover:border-info/50",
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

// NOTE: Package presets (e.g. "Professional Core") are still defined in
// `@workspace/types` for internal/admin custom packages, but they are no
// longer surfaced as toggles on the main pricing UI. The customer-facing
// model is now Tier × PlanMode (Full / Front Desk / Core) — see
// `billing-plans-section.tsx`. Internal admins can still apply presets to
// `Clinic.features` via dedicated tooling.
