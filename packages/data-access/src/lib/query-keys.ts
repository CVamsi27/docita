export type QueryParams = Readonly<object> | undefined;

function withParams<TParams extends QueryParams>(params: TParams) {
  return params ?? {};
}

export const queryKeys = {
  patients: {
    all: () => ["patients"] as const,
    lists: () => ["patients", "list"] as const,
    list: (params?: QueryParams) =>
      ["patients", "list", withParams(params)] as const,
    /** Runtime key used by `usePatient` / invalidation (not `detail`). */
    byId: (id: string) => ["patients", id] as const,
    infinite: (search?: string) =>
      ["patients", "infinite", search ?? ""] as const,
    recent: (limit: number) =>
      ["patients", "recent", limit.toString()] as const,
    withMedicalHistory: (id: string) =>
      ["patients", id, "with-medical-history"] as const,
    medicalHistoryTimeline: (patientId: string) =>
      ["patients", patientId, "medical-history-timeline"] as const,
    todays: (doctorId: string, search = "") =>
      ["todays-patients", doctorId, search] as const,
    /** App `use-patient-history` full-history fetch key. */
    medicalHistoryFull: (patientId: string) =>
      ["patients", patientId, "medical-history"] as const,
    detail: (id: string) => ["patients", "detail", id] as const,
    medicalHistory: (id: string) =>
      ["patients", "detail", id, "medical-history"] as const,
    metrics: {
      root: (id: string) => ["patients", "detail", id, "metrics"] as const,
      categories: (id: string) =>
        ["patients", "detail", id, "metrics", "categories"] as const,
      selected: (id: string) =>
        ["patients", "detail", id, "metrics", "selected"] as const,
      historyRoot: (id: string) =>
        ["patients", "detail", id, "metrics", "history"] as const,
      history: (id: string, params?: QueryParams) =>
        [
          "patients",
          "detail",
          id,
          "metrics",
          "history",
          withParams(params),
        ] as const,
    },
  },
  appointments: {
    all: () => ["appointments"] as const,
    lists: () => ["appointments", "list"] as const,
    list: (params?: QueryParams) =>
      ["appointments", "list", withParams(params)] as const,
    infinite: (params?: QueryParams) =>
      ["appointments", "infinite", withParams(params)] as const,
    detail: (id: string) => ["appointments", "detail", id] as const,
    byPatient: (patientId: string) =>
      ["appointments", "list", { patientId }] as const,
  },
  queue: {
    all: () => ["queue"] as const,
    list: (params?: QueryParams) =>
      ["queue", "list", withParams(params)] as const,
  },
  consultations: {
    all: () => ["consultations"] as const,
    byAppointment: (appointmentId: string) =>
      ["consultations", "appointment", appointmentId] as const,
    detail: (id: string) => ["consultations", "detail", id] as const,
  },
  invoices: {
    all: () => ["invoices"] as const,
    lists: () => ["invoices", "list"] as const,
    list: (params?: QueryParams) =>
      ["invoices", "list", withParams(params)] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
    /** Legacy list/detail keys used by app billing hooks. */
    legacyList: (filters?: QueryParams) =>
      ["invoices", withParams(filters ?? {})] as const,
    legacyInfinite: (options: QueryParams) =>
      ["invoices", "infinite", options] as const,
    legacyDetail: (id: string) => ["invoices", id] as const,
    paymentActivity: (id: string) =>
      ["invoices", id, "payment-activity"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    listAll: () => ["notifications", "all"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
  },
  prescriptions: {
    all: () => ["prescriptions"] as const,
    list: (filters?: QueryParams) =>
      ["prescriptions", withParams(filters ?? {})] as const,
    byPatient: (patientId: string) =>
      ["prescriptions", "patient", patientId] as const,
    detail: (id: string) => ["prescriptions", id] as const,
  },
  clinical: {
    vitals: {
      all: () => ["vitals"] as const,
      patient: (patientId: string) => ["vitals", patientId] as const,
    },
    labTests: {
      orders: () => ["lab-tests"] as const,
      stats: () => ["lab-tests", "stats"] as const,
      ordersList: (filters?: QueryParams) =>
        ["lab-test-orders", withParams(filters ?? {})] as const,
      ordersInvalidation: () => ["lab-test-orders"] as const,
      statsDashboard: () => ["lab-test-stats"] as const,
      catalog: () => ["lab-test-catalog"] as const,
    },
    documents: {
      list: (filters?: QueryParams) =>
        ["documents", withParams(filters ?? {})] as const,
      detail: (id: string) => ["documents", id] as const,
    },
    medicalDocuments: {
      all: () => ["medical-documents"] as const,
      byPatient: (patientId: string) =>
        ["medical-documents", patientId] as const,
    },
    templates: {
      all: () => ["templates"] as const,
      list: (filters?: QueryParams) =>
        ["templates", withParams(filters ?? {})] as const,
      detail: (id: string) => ["templates", id] as const,
    },
  },
  patientTimeline: {
    prefix: (patientId: string) => ["patient-timeline", patientId] as const,
    list: (patientId: string, filters: QueryParams = {}) =>
      ["patient-timeline", patientId, withParams(filters)] as const,
  },
  patientSnapshot: {
    all: () => ["patient-snapshot"] as const,
    detail: (patientId: string) => ["patient-snapshot", patientId] as const,
  },
  ipd: {
    wardsRoot: () => ["ipd", "wards"] as const,
    wards: (search = "") => ["ipd", "wards", search] as const,
    activeAdmissions: () => ["ipd", "admissions", "active"] as const,
  },
  compliance: {
    summary: (clinicId: string) => ["clinic-compliance", clinicId] as const,
    recentAuditLogs: (clinicId: string) =>
      ["audit-logs-recent", clinicId] as const,
    dataSubjectRequests: (clinicId: string) =>
      ["data-subject-requests", clinicId] as const,
  },
  clinicJoinRequests: {
    all: () => ["clinic-join-requests"] as const,
  },
  followUps: {
    all: () => ["follow-ups"] as const,
    list: (options?: QueryParams) =>
      ["follow-ups", withParams(options ?? {})] as const,
  },
  billing: {
    all: () => ["billing"] as const,
    status: () => ["billing-status"] as const,
    paymentHistory: () => ["payment-history"] as const,
    prorationPreview: (tier: string, cycle: string) =>
      ["proration-preview", tier, cycle] as const,
  },
  enterpriseContract: {
    detail: () => ["clinic", "enterprise-contract"] as const,
    estimate: () => ["clinic", "enterprise-contract", "estimate"] as const,
  },
  clinic: {
    subscription: (clinicId?: string | null) =>
      ["clinic-subscription", clinicId] as const,
    subscriptionSettings: () => ["clinic", "subscription"] as const,
    settings: () => ["clinic", "settings"] as const,
    members: () => ["clinic", "members"] as const,
    medicalCodingSettings: () => ["clinic", "medical-coding-settings"] as const,
    prescriptionDefaults: () => ["clinic", "prescription-defaults"] as const,
  },
  doctors: {
    all: () => ["doctors"] as const,
    detail: (id: string) => ["doctors", id] as const,
  },
  doctorSchedules: {
    list: (doctorId: string) => ["doctor-schedules", doctorId] as const,
    clinic: () => ["clinic-schedules"] as const,
  },
  doctorTimeOffs: {
    all: () => ["doctor-time-offs"] as const,
    list: (doctorId: string, scope: "upcoming" | "all") =>
      ["doctor-time-offs", doctorId, scope] as const,
  },
  doctorUnavailability: {
    byDate: (dateStr: string) => ["doctor-unavailability", dateStr] as const,
  },
  doctorDelays: {
    all: () => ["doctor-delays"] as const,
    active: () => ["doctor-delays", "active"] as const,
    byDoctor: (doctorId: string) =>
      ["doctor-delays", "doctor", doctorId] as const,
  },
  appointmentRequests: {
    all: () => ["appointment-requests"] as const,
    list: (options?: QueryParams) =>
      ["appointment-requests", withParams(options ?? {})] as const,
  },
  codingQueue: {
    list: (search?: string) => ["coding-queue", search ?? ""] as const,
  },
  doctorAvailabilitySlots: {
    all: () => ["doctor-availability-slots"] as const,
    forDay: (day: string, doctorId: string) =>
      ["doctor-availability-slots", day, doctorId] as const,
  },
  medications: {
    active: (patientId: string) => ["active-medications", patientId] as const,
    adherence: (patientId: string, prescriptionId = "") =>
      ["medication-adherence", patientId, prescriptionId] as const,
    adherencePrefix: (patientId: string) =>
      ["medication-adherence", patientId] as const,
  },
  patientPortal: {
    dashboard: () => ["patient-portal", "dashboard"] as const,
    appointments: {
      all: () => ["patient-portal", "appointments"] as const,
      list: (filters?: QueryParams) =>
        ["patient-portal", "appointments", withParams(filters ?? {})] as const,
      detail: (id: string) => ["patient-portal", "appointments", id] as const,
    },
    prescriptions: {
      list: (filters?: QueryParams) =>
        ["patient-portal", "prescriptions", withParams(filters ?? {})] as const,
      detail: (id: string) => ["patient-portal", "prescriptions", id] as const,
    },
    invoices: {
      list: (filters?: QueryParams) =>
        ["patient-portal", "invoices", withParams(filters ?? {})] as const,
    },
    consent: () => ["patient-portal", "consent"] as const,
    medicalHistory: (patientId: string) =>
      ["patient-portal", "medical-history", patientId] as const,
    metrics: {
      categories: () => ["patient-portal", "metrics", "categories"] as const,
      history: (filters?: QueryParams) =>
        [
          "patient-portal",
          "metrics",
          "history",
          withParams(filters ?? {}),
        ] as const,
      historyPrefix: () => ["patient-portal", "metrics", "history"] as const,
      selected: () => ["patient-portal", "metrics", "selected"] as const,
      vitalsHistory: (filters?: QueryParams) =>
        [
          "patient-portal",
          "metrics",
          "vitals-history",
          withParams(filters ?? {}),
        ] as const,
    },
    timeline: {
      list: (filters?: QueryParams) =>
        ["patient-portal", "timeline", withParams(filters ?? {})] as const,
      snapshot: () => ["patient-portal", "timeline", "snapshot"] as const,
    },
    medications: {
      active: () => ["patient-portal", "medications", "active"] as const,
      doses: {
        all: () => ["patient-portal", "medications", "doses"] as const,
        list: (filters?: QueryParams) =>
          [
            "patient-portal",
            "medications",
            "doses",
            withParams(filters ?? {}),
          ] as const,
      },
      adherence: (prescriptionId: string) =>
        ["patient-portal", "medications", "adherence", prescriptionId] as const,
    },
  },
  whatsapp: {
    sender: () => ["whatsapp", "sender"] as const,
    stats: () => ["whatsapp", "stats"] as const,
    notifications: {
      unreadCount: () => ["whatsapp", "notifications", "unread-count"] as const,
      unread: (limit: number) =>
        ["whatsapp", "notifications", "unread", limit] as const,
      unreadPrefix: () => ["whatsapp", "notifications", "unread"] as const,
    },
  },
  medicalCoding: {
    icd: (search: string) => ["icd-codes", search] as const,
    cpt: (search: string) => ["cpt-codes", search] as const,
    icdFavorites: () => ["icd-favorites"] as const,
    cptFavorites: () => ["cpt-favorites"] as const,
  },
  leaves: {
    all: () => ["leaves"] as const,
    list: (options?: QueryParams) =>
      ["leaves", "list", withParams(options ?? {})] as const,
    balance: () => ["leaves", "balance"] as const,
  },
  leavePlans: {
    all: () => ["leave-plans"] as const,
  },
  inventory: {
    all: () => ["inventory"] as const,
    list: (filters?: QueryParams) =>
      ["inventory", withParams(filters ?? {})] as const,
    stats: () => ["inventory-stats"] as const,
    detail: (id: string) => ["inventory", id] as const,
  },
  importJobs: {
    template: (entityType: string) => ["import-template", entityType] as const,
    bulkJob: (jobId: string) => ["bulk-import-job", jobId] as const,
  },
  signatures: {
    tokens: () => ["signature-tokens"] as const,
    clinicTokens: (clinicId: string) =>
      ["clinic-signature-tokens", clinicId] as const,
  },
  users: {
    profile: () => ["users", "profile"] as const,
  },
  joinRequests: {
    count: () => ["join-requests", "count"] as const,
  },
  dashboard: {
    stats: () => ["dashboard-stats"] as const,
  },
  appConfig: {
    constants: () => ["constants"] as const,
    formOptions: () => ["form-options"] as const,
  },
  featureFlags: {
    me: () => ["feature-flags", "me"] as const,
  },
  billingHistory: {
    all: () => ["billing-history"] as const,
  },
  analytics: {
    overview: () => ["analytics", "overview"] as const,
    diseaseTrends: (clinicId: string, startDate = "", endDate = "") =>
      ["analytics", "disease-trends", clinicId, startDate, endDate] as const,
    revenueByCpt: (clinicId: string, startDate = "", endDate = "") =>
      ["analytics", "revenue-cpt", clinicId, startDate, endDate] as const,
    complianceMetrics: (clinicId: string, startDate = "", endDate = "") =>
      ["analytics", "compliance", clinicId, startDate, endDate] as const,
    revenueMetrics: (
      clinicId: string,
      period: "daily" | "weekly" | "monthly",
      startDate = "",
      endDate = "",
    ) => ["revenue-metrics", clinicId, period, startDate, endDate] as const,
    appointmentMetrics: (
      clinicId: string,
      period: "daily" | "weekly" | "monthly",
      startDate = "",
      endDate = "",
    ) => ["appointment-metrics", clinicId, period, startDate, endDate] as const,
    patientDemographics: (clinicId: string, startDate = "", endDate = "") =>
      ["patient-demographics", clinicId, startDate, endDate] as const,
    topConditions: (clinicId: string, limit: number) =>
      ["top-conditions", clinicId, limit] as const,
    auditLogs: (params?: QueryParams) =>
      ["audit-logs", withParams(params)] as const,
  },
  /** Anonymous /book/[referralCode] flow (skipAuth); keep keys stable for invalidation. */
  publicBooking: {
    clinic: (referralCode: string) =>
      ["public-booking", "clinic", referralCode] as const,
    doctors: (referralCode: string) =>
      ["public-booking", "doctors", referralCode] as const,
    slots: (referralCode: string, doctorId: string, date: string) =>
      ["public-booking", "slots", referralCode, doctorId, date] as const,
    context: (referralCode: string, bookingVerificationToken: string | null) =>
      [
        "public-booking",
        "context",
        referralCode,
        bookingVerificationToken,
      ] as const,
  },
} as const;

/** App-shell keys (auth, onboarding, config, search, medication helpers, uploads). */
export const appQueryKeys = {
  auth: {
    session: () => ["auth", "session"] as const,
    validate: () => ["auth", "validate"] as const,
    checkEmail: (email: string) => ["auth", "check-email", email] as const,
  },
  onboarding: {
    root: () => ["onboarding"] as const,
    session: (id: string) => ["onboarding", "session", id] as const,
    progress: (id: string) => ["onboarding", "progress", id] as const,
    signatureSession: (onboardingId: string, sessionId: string) =>
      ["onboarding", onboardingId, "signature", sessionId] as const,
    myJoinRequest: () => ["my-join-request"] as const,
  },
  doctorProfile: {
    detail: (doctorId: string) => ["doctor-profile", doctorId] as const,
  },
  clinicSettings: (clinicId: string) => ["clinic-settings", clinicId] as const,
  pricing: {
    config: (currency: string) => ["pricing-config", currency] as const,
    estimate: (queryParams: string | QueryParams) =>
      ["price-estimate", queryParams] as const,
    estimateTier: (tier: string, queryString: string) =>
      ["price-estimate", tier, queryString] as const,
    subscriptionUsage: () => ["subscription-usage"] as const,
  },
  config: {
    app: (clinicId?: string, userId?: string) =>
      ["config", "app", clinicId ?? "default", userId ?? "anonymous"] as const,
    tier: () => ["config", "tier"] as const,
  },
  search: {
    global: (query: string) => ["search", "global", query] as const,
  },
  medication: {
    dosage: (medication: string, dosage: string) =>
      ["medication", "dosage", medication, dosage] as const,
    contraindications: (payloadKey: string) =>
      ["medication", "contraindications", payloadKey] as const,
    interactions: (payloadKey: string) =>
      ["medication", "interactions", payloadKey] as const,
    comprehensive: (payloadKey: string) =>
      ["medication", "comprehensive", payloadKey] as const,
  },
  uploads: {
    session: (sessionId: string) => ["uploads", "session", sessionId] as const,
  },
} as const;

/** Internal admin portal (`apps/internal`) query keys. */
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
    /** Internal payment UI cache key (differs from clinician `pricing-config`). */
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
