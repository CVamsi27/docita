export const adminQueryKeys = {
  auth: {
    session: () => ["auth", "session"] as const,
    validate: () => ["auth", "validate"] as const,
  },
  superAdmin: {
    root: () => ["super-admin"] as const,
    clinics: () => ["super-admin", "clinics"] as const,
    stats: () => ["super-admin", "stats"] as const,
    billingMetrics: () => ["super-admin", "billing", "metrics"] as const,
    analytics: (params: string) =>
      ["super-admin", "analytics", params] as const,
    logs: (params: string) => ["super-admin", "logs", params] as const,
    feedback: (params: string) => ["super-admin", "feedback", params] as const,
    feedbackStats: () => ["super-admin", "feedback", "stats"] as const,
    monitoringPerformance: (params: string) =>
      ["super-admin", "monitoring", "performance", params] as const,
    pricingTiers: () => ["super-admin", "pricing", "tiers"] as const,
    clinicDoctors: (clinicId: string) =>
      ["super-admin", "clinics", clinicId, "doctors"] as const,
    clinicAdmins: (clinicId: string) =>
      ["super-admin", "clinics", clinicId, "admins"] as const,
  },
} as const;

