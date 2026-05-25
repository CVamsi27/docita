/**
 * Default RLS-BYPASS rationales keyed by path substring (first match wins).
 */

export const RLS_BYPASS_RATIONALES = [
  {
    match: "shared/modules/auth/",
    reason: "auth resolves users before clinic tenant context is established",
  },
  {
    match: "patient-portal/",
    reason: "patient portal identity is scoped by patient token, not clinic RLS",
  },
  {
    match: "enterprise-contracts/",
    reason: "enterprise contract administration spans member clinics by design",
  },
  {
    match: "shared/modules/queue/",
    reason: "background queue workers run without per-request clinic session",
  },
  {
    match: "shared/modules/compliance/",
    reason: "compliance retention and archival jobs span tenants by design",
  },
  {
    match: "subscriptions/infrastructure/schedulers/",
    reason: "subscription scheduler runs system-wide without request tenant",
  },
  {
    match: "subscriptions/application/use-cases/",
    reason: "subscription billing use cases run in scheduler context",
  },
  {
    match: "reminders/application/services/reminder-scheduler",
    reason: "reminder scheduler scans appointments without clinic request context",
  },
  {
    match: "billing/application/services/scheduler",
    reason: "billing scheduler operates without per-request clinic session",
  },
  {
    match: "billing/core/services/usage-aggregation",
    reason: "usage aggregation rolls up metrics across clinics",
  },
  {
    match: "billing/application/services/invoice-pdf",
    reason: "invoice PDF worker processes jobs without request tenant context",
  },
  {
    match: "prescriptions/application/services/prescription-pdf",
    reason: "prescription PDF worker processes jobs without request tenant context",
  },
  {
    match: "clinics/application/services/onboarding/",
    reason: "onboarding creates clinic records before membership tenant binding",
  },
  {
    match: "clinics/infrastructure/repositories/prisma-clinic-membership",
    reason: "membership bootstrap runs before clinic tenant context exists",
  },
  {
    match: "users/infrastructure/repositories/",
    reason: "user lookup by identifier precedes clinic tenant binding",
  },
  {
    match: "doctors/infrastructure/repositories/prisma-signature-upload",
    reason: "signature upload persistence uses storage keys outside clinic RLS",
  },
  {
    match: "shared/modules/feature-flags/",
    reason: "feature flags are global configuration, not clinic-scoped",
  },
  {
    match: "shared/modules/public/",
    reason: "public stats aggregate platform-wide metrics without tenant session",
  },
  {
    match: "shared/modules/tenant-rate-limit/",
    reason: "rate limits apply before clinic tenant context is established",
  },
  {
    match: "shared/modules/monitoring/",
    reason: "system telemetry and error logs are not clinic-scoped",
  },
  {
    match: "shared/modules/audit/",
    reason: "audit persistence correlates events across tenants for compliance",
  },
];

export function rationaleForFile(file) {
  for (const { match, reason } of RLS_BYPASS_RATIONALES) {
    if (file.includes(match)) {
      return reason;
    }
  }
  return "cross-tenant or pre-tenant operation requires unrestricted database access";
}
