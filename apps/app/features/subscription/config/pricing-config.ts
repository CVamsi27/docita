import type { TierName } from "@workspace/types";
import {
	Building2,
	Crown,
	type LucideIcon,
	Rocket,
	Sparkles,
	Zap,
} from "lucide-react";

export const PRICING_ESTIMATE_DEBOUNCE_MS = 300;

export const PRICING_DIALOG_TIERS: TierName[] = [
	"STARTER",
	"ESSENTIAL",
	"PROFESSIONAL",
	"ENTERPRISE",
];

export const PRICING_ESTIMATOR_TIERS: TierName[] = [
	"ESSENTIAL",
	"PROFESSIONAL",
	"ENTERPRISE",
];

export const PRICING_DIALOG_TIER_ICONS: Record<TierName, LucideIcon> = {
	STARTER: Zap,
	ESSENTIAL: Rocket,
	PROFESSIONAL: Crown,
	ENTERPRISE: Building2,
	INTELLIGENCE: Sparkles,
};

export const PRICING_DIALOG_TIER_GRADIENTS: Record<TierName, string> = {
	STARTER: "from-muted to-muted/60",
	ESSENTIAL: "from-info/20 to-info/10",
	PROFESSIONAL: "from-primary/20 to-primary/10",
	ENTERPRISE: "from-warning/20 to-warning/10",
	INTELLIGENCE: "from-accent to-accent/70",
};

export const PRICING_DIALOG_TIER_BORDERS: Record<TierName, string> = {
	STARTER: "border-border hover:border-border/70",
	ESSENTIAL: "border-info/30 hover:border-info/50",
	PROFESSIONAL: "border-primary/30 hover:border-primary/50",
	ENTERPRISE: "border-warning/30 hover:border-warning/50",
	INTELLIGENCE: "border-accent-foreground/20 hover:border-accent-foreground/35",
};

export const DEFAULT_PRICING_USAGE_INPUTS = {
	patients: 200,
	appointments: 400,
	users: 2,
	whatsapp: false,
	whatsappMessages: 500,
	intelligence: false,
	aiCredits: 100,
};
