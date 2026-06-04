import type { Clinic } from "./clinic-context-types";

export function toBooleanFeatureOverrides(
  value: Clinic["features"],
): Record<string, boolean> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  );
}
