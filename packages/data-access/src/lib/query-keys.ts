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
    list: (params?: QueryParams) => ["queue", "list", withParams(params)] as const,
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
    ) =>
      ["revenue-metrics", clinicId, period, startDate, endDate] as const,
    appointmentMetrics: (
      clinicId: string,
      period: "daily" | "weekly" | "monthly",
      startDate = "",
      endDate = "",
    ) =>
      ["appointment-metrics", clinicId, period, startDate, endDate] as const,
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
