import { Feature } from "@workspace/types";

const FEATURE_VALUE_SET = new Set<string>(Object.values(Feature));

export function isValidFeature(value: string): value is Feature {
  return FEATURE_VALUE_SET.has(value);
}

export function parseFeatureList(rawFeatures: unknown): Feature[] {
  if (!Array.isArray(rawFeatures)) return [];
  return rawFeatures
    .filter((feature): feature is string => typeof feature === "string")
    .filter(isValidFeature);
}
