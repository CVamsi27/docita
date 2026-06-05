import type { IFeatureOverride } from "./interfaces";
import { isValidFeature } from "./repository-feature-helpers";

export function normalizeOverride(
  raw: Record<string, unknown>,
): IFeatureOverride | null {
  const feature = typeof raw.feature === "string" ? raw.feature : "";
  if (!isValidFeature(feature)) return null;
  return {
    feature,
    granted: Boolean(raw.granted),
    reason: String(raw.reason || ""),
    grantedBy: String(raw.grantedBy || ""),
    expiresAt:
      raw.expiresAt != null ? new Date(String(raw.expiresAt)) : undefined,
    createdAt: new Date(String(raw.createdAt ?? Date.now())),
  };
}
