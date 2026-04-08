export const internalQueryKeys = {
  auth: {
    session: () => ["auth", "session"] as const,
    validate: () => ["auth", "validate"] as const,
  },
  internal: {
    root: () => ["internal"] as const,
    clinics: () => ["internal", "clinics"] as const,
    stats: () => ["internal", "stats"] as const,
    billingMetrics: () => ["internal", "billing", "metrics"] as const,
    analytics: (params: string) =>
      ["internal", "analytics", params] as const,
    logs: (params: string) => ["internal", "logs", params] as const,
    feedback: (params: string) => ["internal", "feedback", params] as const,
    feedbackStats: () => ["internal", "feedback", "stats"] as const,
    monitoringPerformance: (params: string) =>
      ["internal", "monitoring", "performance", params] as const,
    pricingTiers: () => ["internal", "pricing", "tiers"] as const,
    clinicDoctors: (clinicId: string) =>
      ["internal", "clinics", clinicId, "doctors"] as const,
    clinicAdmins: (clinicId: string) =>
      ["internal", "clinics", clinicId, "admins"] as const,
  },
} as const;

