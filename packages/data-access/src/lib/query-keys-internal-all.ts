export const internalQueryKeys = {
  internal: {
    root: () => ["internal"] as const,
    clinics: () => ["internal", "clinics"] as const,
    stats: () => ["internal", "stats"] as const,
    dashboardClinics: (token: string | null | undefined) =>
      ["internal", "dashboard", "clinics", token] as const,
    dashboardStats: (token: string | null | undefined) =>
      ["internal", "dashboard", "stats", token] as const,
    usersClinics: (token: string | null | undefined) =>
      ["internal", "users", "clinics", token] as const,
    usersList: (
      token: string | null | undefined,
      selectedClinic: string,
      clinicsCount: number,
    ) => ["internal", "users", token, selectedClinic, clinicsCount] as const,
    doctorsList: (selectedClinic: string, clinicsCount: number) =>
      ["internal", "doctors", selectedClinic, clinicsCount] as const,
    billingMetrics: () => ["internal", "billing", "metrics"] as const,
    billingSubscriptions: (filtersKey: string) =>
      ["internal", "billing", "subscriptions", filtersKey] as const,
    billingPayments: (filtersKey: string) =>
      ["internal", "billing", "payments", filtersKey] as const,
    billingPricingTiers: () =>
      ["internal", "billing", "pricing", "tiers"] as const,
    enterpriseContracts: () => ["internal", "enterprise-contracts"] as const,
    monitoringDashboard: () => ["internal", "monitoring", "dashboard"] as const,
    monitoringHealth: () => ["internal", "monitoring", "health"] as const,
    healthPerformance: () => ["health", "performance"] as const,
    healthSystemMonitoring: () => ["health", "system-monitoring"] as const,
    monitoringWebVitals: (window: string, variant: string) =>
      ["internal", "monitoring", "web-vitals", window, variant] as const,
    monitoringSecuritySummary: (window: string, variant: string) =>
      ["internal", "monitoring", "security", window, variant] as const,
    monitoringQueueHealth: () =>
      ["internal", "monitoring", "queue-health"] as const,
    analytics: (params: string) => ["internal", "analytics", params] as const,
    auditLogs: (params: string) => ["internal", "audit-logs", params] as const,
    logs: (params: string) => ["internal", "logs", params] as const,
    feedback: (params: string) => ["internal", "feedback", params] as const,
    feedbackStats: () => ["internal", "feedback", "stats"] as const,
    supportInquiries: (limit: number) =>
      ["internal", "support", "inquiries", limit] as const,
    supportWhatsAppThreads: (limit: number) =>
      ["internal", "support", "whatsapp", "threads", limit] as const,
    supportWhatsAppThreadMessages: (threadPhoneNumber: string, limit: number) =>
      [
        "internal",
        "support",
        "whatsapp",
        "threads",
        threadPhoneNumber,
        limit,
      ] as const,
    monitoringPerformance: (params: string) =>
      ["internal", "monitoring", "performance", params] as const,
    performanceMetrics: () => ["internal", "performance", "metrics"] as const,
    performanceDatabase: () => ["internal", "performance", "database"] as const,
    tenantScopeDiagnostics: () =>
      ["internal", "operations", "database", "tenant-scope"] as const,
    pricingTiers: () => ["internal", "pricing", "tiers"] as const,
    pricingConfig: (currency: string) =>
      ["pricing", "config", currency] as const,
    billingPricingOffers: () =>
      ["internal", "billing", "pricing", "offers"] as const,
    clinicTierInfo: (clinicId: string) =>
      ["internal", "clinic", clinicId, "tier-info"] as const,
    clinicDoctors: (clinicId: string) =>
      ["internal", "clinics", clinicId, "doctors"] as const,
    clinicAdmins: (clinicId: string) =>
      ["internal", "clinics", clinicId, "admins"] as const,
    broadcasts: (limit: number) =>
      ["internal", "broadcasts", "list", limit] as const,
    broadcastDetail: (id: string) =>
      ["internal", "broadcasts", "detail", id] as const,
  },
} as const;
