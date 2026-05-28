"use client";

// Re-exports — split into focused files to stay within the 400-line SRP budget.
// Callers that import from this file continue to work without path changes.

export { PatientRightsCard, LogRequestDialog } from "./compliance-patient-rights";
export {
  ConsentTemplateCard,
  DpdpConsentCard,
  DataRetentionCard,
  AuditLogCard,
} from "./compliance-data-cards";
