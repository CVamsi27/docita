/**
 * Canonical doctor-app URL for viewing plans, billing, and upgrades.
 * The `/upgrade` route redirects here so bookmarks remain valid while IA stays unified.
 */
export const SUBSCRIPTION_SETTINGS_PATH = "/settings?tab=subscription";

/** Builds `/settings?tab=subscription` plus extra query pairs (e.g. tier pre-selection). */
export function subscriptionSettingsHref(
  params?: Record<string, string>,
): string {
  if (!params || Object.keys(params).length === 0) {
    return SUBSCRIPTION_SETTINGS_PATH;
  }

  const search = new URLSearchParams({ tab: "subscription" });
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value);
  }

  return `/settings?${search.toString()}`;
}
