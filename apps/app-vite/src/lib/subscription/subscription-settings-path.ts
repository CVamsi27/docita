export const SUBSCRIPTION_SETTINGS_PATH = "/settings?tab=subscription";

function subscriptionSettingsHref(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return SUBSCRIPTION_SETTINGS_PATH;
  const search = new URLSearchParams({ tab: "subscription" });
  for (const [key, value] of Object.entries(params)) search.set(key, value);
  return `/settings?${search.toString()}`;
}

export const SUBSCRIPTION_BILLING_RESOLVE_PATH = subscriptionSettingsHref({ resolvePayment: "1" });
