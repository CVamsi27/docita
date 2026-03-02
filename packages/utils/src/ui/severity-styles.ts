

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
        border: "border-red-500/30",
        bg: "bg-red-500/5",
        badge: "bg-red-500/20 text-red-700 dark:text-red-400",
        iconName: "AlertTriangle",
        textColor: "text-red-700 dark:text-red-400",
      };
    case "moderate":
      return {
        border: "border-yellow-500/30",
        bg: "bg-yellow-500/5",
        badge: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
        iconName: "AlertCircle",
        textColor: "text-yellow-700 dark:text-yellow-400",
      };
    case "minor":
    default:
      return {
        border: "border-blue-500/30",
        bg: "bg-blue-500/5",
        badge: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
        iconName: "Info",
        textColor: "text-blue-700 dark:text-blue-400",
      };
  }
}

export function getConditionSeverityStyles(
  severity: ConditionSeverity,
): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 border-red-300";
    case "SEVERE":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "MODERATE":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "MILD":
      return "bg-green-100 text-green-800 border-green-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

export const ALLERGY_SEVERITY_CONFIG: Record<
  AllergySeverity,
  { color: string; iconName: SeverityIconName; priority: number }
> = {
  LIFE_THREATENING: {
    color: "bg-red-200 text-red-900 border-red-500",
    iconName: "ShieldAlert",
    priority: 1,
  },
  SEVERE: {
    color: "bg-red-100 text-red-800 border-red-300",
    iconName: "ShieldAlert",
    priority: 2,
  },
  MODERATE: {
    color: "bg-orange-100 text-orange-800 border-orange-300",
    iconName: "AlertTriangle",
    priority: 3,
  },
  MILD: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
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
