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
  },
  config: {
    app: (clinicId?: string) => ["config", "app", clinicId ?? "default"] as const,
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

