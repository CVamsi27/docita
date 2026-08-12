/** i18n keys (relative to Subscription.planHighlights) per tier. */
const PLAN_ONBOARDING_KEY_HIGHLIGHT_KEYS: Record<string, string[]> = {
  STARTER: ["starter.patients", "starter.excel", "starter.singleDoctor", "starter.upgrade"],
  ESSENTIAL: ["essential.whatsapp", "essential.invoicing", "essential.queue", "essential.trial"],
  PROFESSIONAL: ["professional.doctors", "professional.bundles", "professional.analytics", "professional.support"],
  HOSPITAL: ["hospital.doctors", "hospital.whatsapp", "hospital.analytics", "hospital.csm"],
  ENTERPRISE: ["enterprise.scale", "enterprise.contracts", "enterprise.rollout", "enterprise.pricing"],
};

export function planHighlightKeys(tierName: string): string[] {
  return PLAN_ONBOARDING_KEY_HIGHLIGHT_KEYS[tierName] ?? [];
}
