import { lazy } from "react";

/* Today / consultation */
export const TodayPage = lazy(() =>
  import("@/features/today/pages/today").then((m) => ({ default: m.TodayPage })),
);
export const ConsultationListPage = lazy(() =>
  import("@/features/consultation/pages/consultation-page").then((m) => ({ default: m.ConsultationListPage })),
);
export const ConsultationDetailPage = lazy(() =>
  import("@/features/consultation/pages/consultation-page").then((m) => ({ default: m.ConsultationDetailPage })),
);

/* Appointments / patients */
export const AppointmentsPage = lazy(() =>
  import("@/features/appointments/pages/appointments-page").then((m) => ({ default: m.AppointmentsPage })),
);
export const PatientsListPage = lazy(() =>
  import("@/features/patients/pages/patients-page").then((m) => ({ default: m.PatientsListPage })),
);
export const PatientDetailPage = lazy(() =>
  import("@/features/patients/pages/patients-page").then((m) => ({ default: m.PatientDetailPage })),
);

/* Prescriptions / invoices / insurance claims */
export const PrescriptionsListPage = lazy(() =>
  import("@/features/prescriptions/pages/prescriptions-page").then((m) => ({ default: m.PrescriptionsListPage })),
);
export const PrescriptionDetailPage = lazy(() =>
  import("@/features/prescriptions/pages/prescriptions-page").then((m) => ({ default: m.PrescriptionDetailPage })),
);
export const InvoicesListPage = lazy(() =>
  import("@/features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoicesListPage })),
);
export const InvoiceNewPage = lazy(() =>
  import("@/features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoiceNewPage })),
);
export const InvoiceDetailPage = lazy(() =>
  import("@/features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoiceDetailPage })),
);
export const InvoiceEditPage = lazy(() =>
  import("@/features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoiceEditPage })),
);
export const ClaimsListPage = lazy(() =>
  import("@/features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimsListPage })),
);
export const ClaimNewPage = lazy(() =>
  import("@/features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimNewPage })),
);
export const ClaimDetailPage = lazy(() =>
  import("@/features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimDetailPage })),
);
export const ClaimEditPage = lazy(() =>
  import("@/features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimEditPage })),
);

/* Lab / inventory / documents / pharmacy */
export const LabTestsPage = lazy(() =>
  import("@/features/lab-tests/pages/lab-tests-page").then((m) => ({ default: m.LabTestsPage })),
);
export const InventoryPage = lazy(() =>
  import("@/features/inventory/pages/inventory-page").then((m) => ({ default: m.InventoryPage })),
);
export const DocumentsPage = lazy(() =>
  import("@/features/documents/pages/documents-page").then((m) => ({ default: m.DocumentsPage })),
);
export const PharmacyPage = lazy(() =>
  import("@/features/pharmacy/pages/pharmacy-page").then((m) => ({ default: m.PharmacyPage })),
);

/* Communication / analytics / coding */
export const WhatsAppPage = lazy(() =>
  import("@/features/whatsapp/pages/whatsapp-page").then((m) => ({ default: m.WhatsAppPage })),
);
export const InboxPage = lazy(() =>
  import("@/features/inbox/pages/inbox-page").then((m) => ({ default: m.InboxPage })),
);
export const AnalyticsPage = lazy(() =>
  import("@/features/analytics/pages/analytics-page").then((m) => ({ default: m.AnalyticsPage })),
);
export const ReportsPage = lazy(() =>
  import("@/features/analytics/pages/analytics-page").then((m) => ({ default: m.ReportsPage })),
);
export const CodingQueuePage = lazy(() =>
  import("@/features/medical-coding/pages/coding-queue-page").then((m) => ({ default: m.CodingQueuePage })),
);

/* Desk / daybook / help / profile / templates / AI / billing */
export const DaybookPage = lazy(() =>
  import("@/features/daybook/pages/daybook-page").then((m) => ({ default: m.DaybookPage })),
);
export const DeskCollectPaymentPage = lazy(() =>
  import("@/features/desk/pages/desk-pages").then((m) => ({ default: m.DeskCollectPaymentPage })),
);
export const DeskFloorPage = lazy(() =>
  import("@/features/desk/pages/desk-pages").then((m) => ({ default: m.DeskFloorPage })),
);
export const HelpPage = lazy(() =>
  import("@/features/help/pages/help-page").then((m) => ({ default: m.HelpPage })),
);
export const ProfilePage = lazy(() =>
  import("@/features/profile/pages/profile-page").then((m) => ({ default: m.ProfilePage })),
);
export const TemplatesPage = lazy(() =>
  import("@/features/templates/pages/templates-page").then((m) => ({ default: m.TemplatesPage })),
);
export const AiAssistantPage = lazy(() =>
  import("@/features/ai-assistant/pages/ai-assistant-page").then((m) => ({ default: m.AiAssistantPage })),
);
export const BillingLockedPage = lazy(() =>
  import("@/features/billing-locked/pages/billing-locked-page").then((m) => ({ default: m.BillingLockedPage })),
);
export const UpgradePage = lazy(() =>
  import("@/features/upgrade/pages/upgrade-page").then((m) => ({ default: m.UpgradePage })),
);

/* Referrals / ipd shells / imports */
export const HospitalBedsPage = lazy(() =>
  import("@/features/referrals/pages/referrals-page").then((m) => ({ default: m.HospitalBedsPage })),
);
export const ReferralsPage = lazy(() =>
  import("@/features/referrals/pages/referrals-page").then((m) => ({ default: m.ReferralsPage })),
);
export const SpecialtyPage = lazy(() =>
  import("@/features/referrals/pages/referrals-page").then((m) => ({ default: m.SpecialtyPage })),
);
export const DentalChartsPage = lazy(() =>
  import("@/features/referrals/pages/referrals-page").then((m) => ({ default: m.DentalChartsPage })),
);
export const FollowUpsPage = lazy(() =>
  import("@/features/referrals/pages/referrals-page").then((m) => ({ default: m.FollowUpsPage })),
);
export const ImportsPage = lazy(() =>
  import("@/features/imports/pages/imports-page").then((m) => ({ default: m.ImportsPage })),
);
