import type { TierName } from "@workspace/types";
import {
	Building2,
	Crown,
	type LucideIcon,
	Rocket,
	Sparkles,
	Zap,
} from "lucide-react";

export type PricingScalePresetKey =
	| "SOLO"
	| "GROWTH"
	| "MULTI_DOCTOR"
	| "HIGH_VOLUME";

type PricingScalePreset = {
	label: string;
	patients: number;
	appointments: number;
	users: number;
	whatsappMessages: number;
	aiCredits: number;
};

type PricingUsageDefaults = {
	patients: number;
	appointments: number;
	users: number;
	whatsapp: boolean;
	whatsappMessages: number;
	intelligence: boolean;
	aiCredits: number;
};

export const PRICING_ESTIMATE_DEBOUNCE_MS = 300;

export const PRICING_DIALOG_TIERS: TierName[] = [
	"CAPTURE",
	"CORE",
	"PLUS",
	"PRO",
	"ENTERPRISE",
];

export const PRICING_ESTIMATOR_TIERS: TierName[] = [
	"CORE",
	"PLUS",
	"PRO",
	"ENTERPRISE",
];

export const PRICING_DIALOG_TIER_ICONS: Record<TierName, LucideIcon> = {
	CAPTURE: Zap,
	CORE: Rocket,
	PLUS: Sparkles,
	PRO: Crown,
	ENTERPRISE: Building2,
	INTELLIGENCE: Sparkles,
};

export const PRICING_DIALOG_TIER_GRADIENTS: Record<TierName, string> = {
	CAPTURE: "from-muted to-muted/60",
	CORE: "from-info/20 to-info/10",
	PLUS: "from-success/20 to-success/10",
	PRO: "from-primary/20 to-primary/10",
	ENTERPRISE: "from-warning/20 to-warning/10",
	INTELLIGENCE: "from-accent to-accent/70",
};

export const PRICING_DIALOG_TIER_BORDERS: Record<TierName, string> = {
	CAPTURE: "border-border hover:border-border/70",
	CORE: "border-info/30 hover:border-info/50",
	PLUS: "border-success/30 hover:border-success/50",
	PRO: "border-primary/30 hover:border-primary/50",
	ENTERPRISE: "border-warning/30 hover:border-warning/50",
	INTELLIGENCE: "border-accent-foreground/20 hover:border-accent-foreground/35",
};

export const PRICING_SCALE_PRESETS: Record<PricingScalePresetKey, PricingScalePreset> = {
	SOLO: {
		label: "Solo practice",
		patients: 200,
		appointments: 300,
		users: 1,
		whatsappMessages: 400,
		aiCredits: 100,
	},
	GROWTH: {
		label: "Growing clinic",
		patients: 600,
		appointments: 900,
		users: 3,
		whatsappMessages: 1200,
		aiCredits: 350,
	},
	MULTI_DOCTOR: {
		label: "Multi-doctor",
		patients: 1800,
		appointments: 2600,
		users: 8,
		whatsappMessages: 5000,
		aiCredits: 1000,
	},
	HIGH_VOLUME: {
		label: "High-volume scale",
		patients: 6000,
		appointments: 9000,
		users: 20,
		whatsappMessages: 20000,
		aiCredits: 3500,
	},
};

export const DEFAULT_PRICING_SCALE_PRESET: PricingScalePresetKey = "GROWTH";

export const DEFAULT_PRICING_USAGE_INPUTS: PricingUsageDefaults = {
	patients: PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].patients,
	appointments: PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].appointments,
	users: PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].users,
	whatsapp: true,
	whatsappMessages:
		PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].whatsappMessages,
	intelligence: false,
	aiCredits: PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].aiCredits,
};
