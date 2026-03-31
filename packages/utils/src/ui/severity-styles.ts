

export type InteractionSeverity = "minor" | "moderate" | "major";
export type ConditionSeverity = "MILD" | "MODERATE" | "SEVERE" | "CRITICAL";
export type AllergySeverity =
  | "MILD"
  | "MODERATE"
  | "SEVERE"
  | "LIFE_THREATENING";

export type SeverityIconName =
  | "AlertCircle"
  | "AlertTriangle"
  | "Info"
  | "ShieldAlert";

export interface SeverityStyles {
  border: string;
  bg: string;
  badge: string;
  iconName: SeverityIconName;
  textColor?: string;
}

export function getInteractionSeverityStyles(
  severity: InteractionSeverity,
): SeverityStyles {
  switch (severity) {
    case "major":
      return {
        border: "border-destructive/30",
        bg: "bg-destructive/5",
        badge: "badge-danger",
        iconName: "AlertTriangle",
        textColor: "text-destructive",
      };
    case "moderate":
      return {
        border: "border-warning/30",
        bg: "bg-warning/5",
        badge: "badge-warning",
        iconName: "AlertCircle",
        textColor: "text-warning",
      };
    case "minor":
    default:
      return {
        border: "border-info/30",
        bg: "bg-info/5",
        badge: "badge-info",
        iconName: "Info",
        textColor: "text-info",
      };
  }
}

export function getConditionSeverityStyles(
  severity: ConditionSeverity,
): string {
  switch (severity) {
    case "CRITICAL":
      return "badge-danger";
    case "SEVERE":
      return "bg-warning/20 text-warning border-warning/40";
    case "MODERATE":
      return "badge-warning";
    case "MILD":
      return "badge-success";
    default:
      return "badge-muted";
  }
}

export const ALLERGY_SEVERITY_CONFIG: Record<
  AllergySeverity,
  { color: string; iconName: SeverityIconName; priority: number }
> = {
  LIFE_THREATENING: {
    color: "badge-danger animate-pulse",
    iconName: "ShieldAlert",
    priority: 1,
  },
  SEVERE: {
    color: "badge-danger",
    iconName: "ShieldAlert",
    priority: 2,
  },
  MODERATE: {
    color: "bg-warning/20 text-warning border-warning/40",
    iconName: "AlertTriangle",
    priority: 3,
  },
  MILD: {
    color: "badge-warning",
    iconName: "AlertCircle",
    priority: 4,
  },
};

export function getAllergySeverityConfig(severity: AllergySeverity) {
  return ALLERGY_SEVERITY_CONFIG[severity];
}

export function sortAllergiesBySeverity<
  T extends { severity: AllergySeverity },
>(allergies: T[]): T[] {
  return [...allergies].sort(
    (a, b) =>
      ALLERGY_SEVERITY_CONFIG[a.severity].priority -
      ALLERGY_SEVERITY_CONFIG[b.severity].priority,
  );
}

export function isCriticalAllergy(severity: AllergySeverity): boolean {
  return severity === "LIFE_THREATENING" || severity === "SEVERE";
}
