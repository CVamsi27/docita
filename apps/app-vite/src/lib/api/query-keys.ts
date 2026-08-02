export const appQueryKeys = {
  config: {
    app: (clinicId?: string, userId?: string) => ["app-config", clinicId, userId],
  },
  patients: {
    list: (params?: Record<string, unknown>) => ["patients", "list", params],
    detail: (id: string) => ["patients", id],
    search: (query: string) => ["patients", "search", query],
  },
  appointments: {
    today: () => ["appointments", "today"] as const,
    list: (params?: Record<string, unknown>) => ["appointments", "list", params],
    detail: (id: string) => ["appointments", id],
  },
  consultation: {
    dashboard: () => ["consultation", "dashboard"] as const,
    queue: () => ["consultation", "queue"] as const,
    detail: (id: string) => ["consultation", id],
  },
  invoices: {
    list: () => ["invoices", "list"] as const,
    detail: (id: string) => ["invoices", id],
  },
  prescriptions: {
    list: () => ["prescriptions", "list"] as const,
    detail: (id: string) => ["prescriptions", id],
  },
  insuranceClaims: {
    list: () => ["insurance-claims", "list"] as const,
    detail: (id: string) => ["insurance-claims", id],
  },
  team: {
    list: () => ["team", "list"] as const,
  },
  ipd: {
    wards: ["ipd", "wards"] as const,
    activeAdmissions: ["ipd", "admissions", "active"] as const,
  },
  search: {
    global: (query: string) => ["search", "global", query],
  },
  subscription: {
    workspace: () => ["subscription", "workspace"] as const,
    plans: () => ["subscription", "plans"] as const,
    billingHistory: () => ["subscription", "billing", "history"] as const,
  },
  enterpriseContract: {
    detail: () => ["clinic", "enterprise-contract"] as const,
    estimate: () => ["clinic", "enterprise-contract", "estimate"] as const,
  },
};
