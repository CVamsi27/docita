import { Feature } from "../billing/tier";

/** Resolve a feature enum or string key to {@link Feature}, or null when unknown. */
export function coerceFeature(feature: Feature | string): Feature | null {
  if (typeof feature !== "string") return feature;
  for (const value of Object.values(Feature)) {
    if (value === feature) return value;
  }
  return null;
}
