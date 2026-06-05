import { type QueryParams } from "./query-key-core";

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
