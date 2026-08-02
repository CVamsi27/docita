import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { RootLayout } from "./components/layout/root-layout";
import { ProtectedLayout } from "./components/layout/protected-layout";
import { SetupLayout } from "./components/layout/setup-layout";
import { PublicLayout } from "./components/layout/public-layout";
import { PortalLayout } from "./components/layout/portal-layout";
import { LabPortalLayout } from "./components/layout/lab-portal-layout";
import { ToolsLayout } from "./components/layout/tools-layout";
import { PublicRoute } from "./components/layout/public-route";
import { PageTransitionLoader } from "./components/loaders/page-transition-loader";

/* ── Auth Pages ─────────────────────────────────────── */
const AuthPageContainer = lazy(() =>
  import("./features/auth/components/AuthPageContainer").then((m) => ({ default: m.AuthPageContainer })),
);
const ForgotPasswordPage = lazy(() =>
  import("./features/auth/pages/forgot-password").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("./features/auth/pages/reset-password").then((m) => ({ default: m.ResetPasswordPage })),
);

/* ── Setup Pages ────────────────────────────────────── */
const ChoosePathPage = lazy(() =>
  import("./features/setup/pages/choose-path").then((m) => ({ default: m.ChoosePathPage })),
);
const ClinicSelectionPage = lazy(() =>
  import("./features/setup/pages/clinic-selection-page").then((m) => ({ default: m.ClinicSelectionPage })),
);
const JoinClinicPage = lazy(() =>
  import("./features/setup/pages/join-clinic-page").then((m) => ({ default: m.JoinClinicPage })),
);
const JoinRequestStatusPage = lazy(() =>
  import("./features/setup/pages/join-request-status-page").then((m) => ({ default: m.JoinRequestStatusPage })),
);
const OnboardingPage = lazy(() =>
  import("./features/setup/pages/onboarding-page").then((m) => ({ default: m.OnboardingPage })),
);
const VerifyDoctorPage = lazy(() =>
  import("./features/setup/pages/verify-doctor-page").then((m) => ({ default: m.VerifyDoctorPage })),
);
const VerifyEmailPage = lazy(() =>
  import("./features/verify-email/pages/verify-email-page").then((m) => ({ default: m.VerifyEmailPage })),
);
const VerifyEmailSentPage = lazy(() =>
  import("./features/verify-email/pages/verify-email-page").then((m) => ({ default: m.VerifyEmailSentPage })),
);
const VerifiedPage = lazy(() =>
  import("./features/verify-email/pages/verify-email-page").then((m) => ({ default: m.VerifiedPage })),
);
const UploadSignatureTokenPage = lazy(() =>
  import("./features/upload-signature/pages/upload-signature-page").then((m) => ({ default: m.UploadSignatureTokenPage })),
);
const UploadSignatureOnboardingPage = lazy(() =>
  import("./features/upload-signature/pages/upload-signature-page").then((m) => ({ default: m.UploadSignatureOnboardingPage })),
);

/* ── Protected Pages (Clinical App) ─────────────────── */
const TodayPage = lazy(() =>
  import("./features/today/pages/today").then((m) => ({ default: m.TodayPage })),
);
const ConsultationListPage = lazy(() =>
  import("./features/consultation/pages/consultation-page").then((m) => ({ default: m.ConsultationListPage })),
);
const ConsultationDetailPage = lazy(() =>
  import("./features/consultation/pages/consultation-page").then((m) => ({ default: m.ConsultationDetailPage })),
);
const AppointmentsPage = lazy(() =>
  import("./features/appointments/pages/appointments-page").then((m) => ({ default: m.AppointmentsPage })),
);
const PatientsListPage = lazy(() =>
  import("./features/patients/pages/patients-page").then((m) => ({ default: m.PatientsListPage })),
);
const PatientDetailPage = lazy(() =>
  import("./features/patients/pages/patients-page").then((m) => ({ default: m.PatientDetailPage })),
);
const PrescriptionsListPage = lazy(() =>
  import("./features/prescriptions/pages/prescriptions-page").then((m) => ({ default: m.PrescriptionsListPage })),
);
const PrescriptionDetailPage = lazy(() =>
  import("./features/prescriptions/pages/prescriptions-page").then((m) => ({ default: m.PrescriptionDetailPage })),
);
const InvoicesListPage = lazy(() =>
  import("./features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoicesListPage })),
);
const InvoiceNewPage = lazy(() =>
  import("./features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoiceNewPage })),
);
const InvoiceDetailPage = lazy(() =>
  import("./features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoiceDetailPage })),
);
const InvoiceEditPage = lazy(() =>
  import("./features/invoices/pages/invoices-page").then((m) => ({ default: m.InvoiceEditPage })),
);
const ClaimsListPage = lazy(() =>
  import("./features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimsListPage })),
);
const ClaimNewPage = lazy(() =>
  import("./features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimNewPage })),
);
const ClaimDetailPage = lazy(() =>
  import("./features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimDetailPage })),
);
const ClaimEditPage = lazy(() =>
  import("./features/insurance-claims/pages/claims-page").then((m) => ({ default: m.ClaimEditPage })),
);
const LabTestsPage = lazy(() =>
  import("./features/lab-tests/pages/lab-tests-page").then((m) => ({ default: m.LabTestsPage })),
);
const InventoryPage = lazy(() =>
  import("./features/inventory/pages/inventory-page").then((m) => ({ default: m.InventoryPage })),
);
const DocumentsPage = lazy(() =>
  import("./features/documents/pages/documents-page").then((m) => ({ default: m.DocumentsPage })),
);
const PharmacyPage = lazy(() =>
  import("./features/pharmacy/pages/pharmacy-page").then((m) => ({ default: m.PharmacyPage })),
);
const SettingsPage = lazy(() =>
  import("./features/settings/pages/settings-page").then((m) => ({ default: m.SettingsPage })),
);
const SettingsTeamPage = lazy(() =>
  import("./features/settings/pages/settings-team-page").then((m) => ({ default: m.SettingsTeamPage })),
);
const SettingsTeamJoinRequestsPage = lazy(() =>
  import("./features/settings/pages/settings-team-page").then((m) => ({ default: m.SettingsTeamJoinRequestsPage })),
);
const SettingsClinicPage = lazy(() =>
  import("./features/settings/pages/settings-clinic-page").then((m) => ({ default: m.SettingsClinicPage })),
);
const SettingsCompliancePage = lazy(() =>
  import("./features/settings/pages/settings-compliance-page").then((m) => ({ default: m.SettingsCompliancePage })),
);
const SettingsWhatsappSenderPage = lazy(() =>
  import("./features/settings/pages/settings-whatsapp-sender-page").then((m) => ({ default: m.SettingsWhatsappSenderPage })),
);
const SettingsComplianceConsentTemplatePage = lazy(() =>
  import("./features/settings/pages/settings-consent-template-page").then((m) => ({ default: m.SettingsComplianceConsentTemplatePage })),
);
const SettingsTemplatesPage = lazy(() =>
  import("./features/settings/pages/settings-templates-page").then((m) => ({ default: m.SettingsTemplatesPage })),
);
const SettingsAppearancePage = lazy(() =>
  import("./features/settings/pages/settings-appearance-page").then((m) => ({ default: m.SettingsAppearancePage })),
);
const SettingsQueuePage = lazy(() =>
  import("./features/settings/pages/settings-queue-page").then((m) => ({ default: m.SettingsQueuePage })),
);
const SettingsClinicalPage = lazy(() =>
  import("./features/settings/pages/settings-clinical-page").then((m) => ({ default: m.SettingsClinicalPage })),
);
const SettingsSecurityPage = lazy(() =>
  import("./features/settings/pages/settings-security-page").then((m) => ({ default: m.SettingsSecurityPage })),
);
const SettingsNotificationsPage = lazy(() =>
  import("./features/settings/pages/settings-notifications-page").then((m) => ({ default: m.SettingsNotificationsPage })),
);
const SettingsDangerZonePage = lazy(() =>
  import("./features/settings/pages/settings-danger-zone-page").then((m) => ({ default: m.SettingsDangerZonePage })),
);
const SettingsDoctorProfilePage = lazy(() =>
  import("./features/settings/pages/settings-doctor-profile-page").then((m) => ({ default: m.SettingsDoctorProfilePage })),
);
const SettingsAvailabilityPage = lazy(() =>
  import("./features/settings/pages/settings-availability-page").then((m) => ({ default: m.SettingsAvailabilityPage })),
);
const SettingsLeavePage = lazy(() =>
  import("./features/settings/pages/settings-leave-page").then((m) => ({ default: m.SettingsLeavePage })),
);
const SettingsAccountPage = lazy(() =>
  import("./features/settings/pages/settings-account-page").then((m) => ({ default: m.SettingsAccountPage })),
);
const WhatsAppPage = lazy(() =>
  import("./features/whatsapp/pages/whatsapp-page").then((m) => ({ default: m.WhatsAppPage })),
);
const InboxPage = lazy(() =>
  import("./features/inbox/pages/inbox-page").then((m) => ({ default: m.InboxPage })),
);
const AnalyticsPage = lazy(() =>
  import("./features/analytics/pages/analytics-page").then((m) => ({ default: m.AnalyticsPage })),
);
const ReportsPage = lazy(() =>
  import("./features/analytics/pages/analytics-page").then((m) => ({ default: m.ReportsPage })),
);
const CodingQueuePage = lazy(() =>
  import("./features/medical-coding/pages/coding-queue-page").then((m) => ({ default: m.CodingQueuePage })),
);
const DaybookPage = lazy(() =>
  import("./features/daybook/pages/daybook-page").then((m) => ({ default: m.DaybookPage })),
);
const DeskCollectPaymentPage = lazy(() =>
  import("./features/desk/pages/desk-pages").then((m) => ({ default: m.DeskCollectPaymentPage })),
);
const DeskFloorPage = lazy(() =>
  import("./features/desk/pages/desk-pages").then((m) => ({ default: m.DeskFloorPage })),
);
const HelpPage = lazy(() =>
  import("./features/help/pages/help-page").then((m) => ({ default: m.HelpPage })),
);
const ProfilePage = lazy(() =>
  import("./features/profile/pages/profile-page").then((m) => ({ default: m.ProfilePage })),
);
const TemplatesPage = lazy(() =>
  import("./features/templates/pages/templates-page").then((m) => ({ default: m.TemplatesPage })),
);
const AiAssistantPage = lazy(() =>
  import("./features/ai-assistant/pages/ai-assistant-page").then((m) => ({ default: m.AiAssistantPage })),
);
const BillingLockedPage = lazy(() =>
  import("./features/billing-locked/pages/billing-locked-page").then((m) => ({ default: m.BillingLockedPage })),
);
const UpgradePage = lazy(() =>
  import("./features/upgrade/pages/upgrade-page").then((m) => ({ default: m.UpgradePage })),
);
const HospitalBedsPage = lazy(() =>
  import("./features/referrals/pages/referrals-page").then((m) => ({ default: m.HospitalBedsPage })),
);
const ReferralsPage = lazy(() =>
  import("./features/referrals/pages/referrals-page").then((m) => ({ default: m.ReferralsPage })),
);
const SpecialtyPage = lazy(() =>
  import("./features/referrals/pages/referrals-page").then((m) => ({ default: m.SpecialtyPage })),
);
const DentalChartsPage = lazy(() =>
  import("./features/referrals/pages/referrals-page").then((m) => ({ default: m.DentalChartsPage })),
);
const FollowUpsPage = lazy(() =>
  import("./features/referrals/pages/referrals-page").then((m) => ({ default: m.FollowUpsPage })),
);
const ImportsPage = lazy(() =>
  import("./features/imports/pages/imports-page").then((m) => ({ default: m.ImportsPage })),
);

/* ── Portal Pages ──────────────────────────────────── */
const PortalHomePage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalHomePage })),
);
const PortalLoginPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalLoginPage })),
);
const PortalAppointmentsPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalAppointmentsPage })),
);
const PortalBillingPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalBillingPage })),
);
const PortalHistoryPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalHistoryPage })),
);
const PortalMedicationsPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalMedicationsPage })),
);
const PortalMetricsPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalMetricsPage })),
);
const PortalPrescriptionsPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalPrescriptionsPage })),
);
const PortalProfilePage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalProfilePage })),
);
const PortalConsentFormPage = lazy(() =>
  import("./features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalConsentFormPage })),
);

/* ── Public Pages ──────────────────────────────────── */
const BookingPage = lazy(() =>
  import("./features/public-booking/pages/public-booking-page").then((m) => ({
    default: m.PublicBookingPageRoute,
  })),
);
const MobileUploadPage = lazy(() =>
  import("./features/mobile-upload/pages/mobile-upload-page").then((m) => ({ default: m.MobileUploadPage })),
);
const PartnerHomePage = lazy(() =>
  import("./features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerHomePage })),
);
const PartnerLoginPage = lazy(() =>
  import("./features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerLoginPage })),
);
const PartnerDashboardPage = lazy(() =>
  import("./features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerDashboardPage })),
);
const PartnerBankingPage = lazy(() =>
  import("./features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerBankingPage })),
);
const PartnerPayoutsPage = lazy(() =>
  import("./features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerPayoutsPage })),
);
const PartnerReferralsPage = lazy(() =>
  import("./features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerReferralsPage })),
);
const PartnerSharePage = lazy(() =>
  import("./features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerSharePage })),
);

/* ── Lab Portal Pages ───────────────────────────────── */
const LabPortalHomePage = lazy(() =>
  import("./features/lab-portal/pages/lab-portal-pages").then((m) => ({ default: m.LabPortalHomePage })),
);
const LabPortalLoginPage = lazy(() =>
  import("./features/lab-portal/pages/lab-portal-pages").then((m) => ({ default: m.LabPortalLoginPage })),
);

/* ── Tools Pages ────────────────────────────────────── */
const VisualTestPage = lazy(() =>
  import("./features/tools/pages/tools-pages").then((m) => ({ default: m.VisualTestPage })),
);
const E2ESessionSeedPage = lazy(() =>
  import("./features/tools/pages/tools-pages").then((m) => ({ default: m.E2ESessionSeedPage })),
);
const NotFoundPage = lazy(() =>
  import("./features/errors/pages/not-found").then((m) => ({ default: m.NotFoundPage })),
);

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <PageTransitionLoader title="Loading…" />
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      {/* ── Root Layout ───────────────────────────── */}
      <Route element={<RootLayout />}>
        {/* ── Auth Routes (public, no auth required) ── */}
        <Route path="/login" element={
          <SuspenseWrapper><PublicRoute><AuthPageContainer /></PublicRoute></SuspenseWrapper>
        } />
        <Route path="/forgot-password" element={
          <SuspenseWrapper><PublicRoute><ForgotPasswordPage /></PublicRoute></SuspenseWrapper>
        } />
        <Route path="/reset-password" element={
          <SuspenseWrapper><PublicRoute><ResetPasswordPage /></PublicRoute></SuspenseWrapper>
        } />

        {/* ── Setup Routes (auth required, no clinic) ── */}
        <Route element={<SetupLayout />}>
          <Route path="/choose-path" element={<SuspenseWrapper><ChoosePathPage /></SuspenseWrapper>} />
          <Route path="/clinic-selection" element={<SuspenseWrapper><ClinicSelectionPage /></SuspenseWrapper>} />
          <Route path="/join-clinic" element={<SuspenseWrapper><JoinClinicPage /></SuspenseWrapper>} />
          <Route path="/join-request-status" element={<SuspenseWrapper><JoinRequestStatusPage /></SuspenseWrapper>} />
          <Route path="/onboarding" element={<SuspenseWrapper><OnboardingPage /></SuspenseWrapper>} />
          <Route path="/verify-doctor" element={<SuspenseWrapper><VerifyDoctorPage /></SuspenseWrapper>} />
          <Route path="/verify-email" element={<SuspenseWrapper><VerifyEmailPage /></SuspenseWrapper>} />
          <Route path="/verify-email-sent" element={<SuspenseWrapper><VerifyEmailSentPage /></SuspenseWrapper>} />
          <Route path="/verify-email/verified" element={<SuspenseWrapper><VerifiedPage /></SuspenseWrapper>} />
          <Route path="/upload-signature/:token" element={<SuspenseWrapper><UploadSignatureTokenPage /></SuspenseWrapper>} />
          <Route path="/upload-signature/onboarding" element={<SuspenseWrapper><UploadSignatureOnboardingPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Portal Routes ─────────────────────────── */}
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<SuspenseWrapper><PortalHomePage /></SuspenseWrapper>} />
          <Route path="/portal/login" element={<SuspenseWrapper><PortalLoginPage /></SuspenseWrapper>} />
          <Route path="/portal/appointments" element={<SuspenseWrapper><PortalAppointmentsPage /></SuspenseWrapper>} />
          <Route path="/portal/billing" element={<SuspenseWrapper><PortalBillingPage /></SuspenseWrapper>} />
          <Route path="/portal/history" element={<SuspenseWrapper><PortalHistoryPage /></SuspenseWrapper>} />
          <Route path="/portal/medications" element={<SuspenseWrapper><PortalMedicationsPage /></SuspenseWrapper>} />
          <Route path="/portal/metrics" element={<SuspenseWrapper><PortalMetricsPage /></SuspenseWrapper>} />
          <Route path="/portal/prescriptions" element={<SuspenseWrapper><PortalPrescriptionsPage /></SuspenseWrapper>} />
          <Route path="/portal/profile" element={<SuspenseWrapper><PortalProfilePage /></SuspenseWrapper>} />
          <Route path="/portal/profile/consent-form" element={<SuspenseWrapper><PortalConsentFormPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Public Routes (partner, booking, upload) ── */}
        <Route element={<PublicLayout />}>
          <Route path="/book/:referralCode" element={<SuspenseWrapper><BookingPage /></SuspenseWrapper>} />
          <Route path="/mobile-upload/:id" element={<SuspenseWrapper><MobileUploadPage /></SuspenseWrapper>} />
          <Route path="/partner" element={<SuspenseWrapper><PartnerHomePage /></SuspenseWrapper>} />
          <Route path="/partner/login" element={<SuspenseWrapper><PartnerLoginPage /></SuspenseWrapper>} />
          <Route path="/partner/dashboard" element={<SuspenseWrapper><PartnerDashboardPage /></SuspenseWrapper>} />
          <Route path="/partner/banking" element={<SuspenseWrapper><PartnerBankingPage /></SuspenseWrapper>} />
          <Route path="/partner/payouts" element={<SuspenseWrapper><PartnerPayoutsPage /></SuspenseWrapper>} />
          <Route path="/partner/referrals" element={<SuspenseWrapper><PartnerReferralsPage /></SuspenseWrapper>} />
          <Route path="/partner/share" element={<SuspenseWrapper><PartnerSharePage /></SuspenseWrapper>} />
        </Route>

        {/* ── Lab Portal Routes ─────────────────────── */}
        <Route element={<LabPortalLayout />}>
          <Route path="/lab-portal" element={<SuspenseWrapper><LabPortalHomePage /></SuspenseWrapper>} />
          <Route path="/lab-portal/login" element={<SuspenseWrapper><LabPortalLoginPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Tools Routes (dev-only) ────────────────── */}
        <Route element={<ToolsLayout />}>
          <Route path="/visual-test/:fixture" element={<SuspenseWrapper><VisualTestPage /></SuspenseWrapper>} />
          <Route path="/e2e-session-seed" element={<SuspenseWrapper><E2ESessionSeedPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Protected Routes (clinic app) ──────────── */}
        <Route element={<ProtectedLayout />}>
          <Route path="/today" element={<SuspenseWrapper><TodayPage /></SuspenseWrapper>} />
          <Route path="/dashboard" element={<Navigate to="/today" replace />} />
          <Route path="/consultation" element={<SuspenseWrapper><ConsultationListPage /></SuspenseWrapper>} />
          <Route path="/consultation/:id" element={<SuspenseWrapper><ConsultationDetailPage /></SuspenseWrapper>} />
          <Route path="/appointments" element={<SuspenseWrapper><AppointmentsPage /></SuspenseWrapper>} />
          <Route path="/patients" element={<SuspenseWrapper><PatientsListPage /></SuspenseWrapper>} />
          <Route path="/patients/:id" element={<SuspenseWrapper><PatientDetailPage /></SuspenseWrapper>} />
          <Route path="/prescriptions" element={<SuspenseWrapper><PrescriptionsListPage /></SuspenseWrapper>} />
          <Route path="/prescriptions/:id" element={<SuspenseWrapper><PrescriptionDetailPage /></SuspenseWrapper>} />
          <Route path="/invoices" element={<SuspenseWrapper><InvoicesListPage /></SuspenseWrapper>} />
          <Route path="/invoices/new" element={<SuspenseWrapper><InvoiceNewPage /></SuspenseWrapper>} />
          <Route path="/invoices/:id" element={<SuspenseWrapper><InvoiceDetailPage /></SuspenseWrapper>} />
          <Route path="/invoices/:id/edit" element={<SuspenseWrapper><InvoiceEditPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims" element={<SuspenseWrapper><ClaimsListPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims/new" element={<SuspenseWrapper><ClaimNewPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims/:id" element={<SuspenseWrapper><ClaimDetailPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims/:id/edit" element={<SuspenseWrapper><ClaimEditPage /></SuspenseWrapper>} />
          <Route path="/lab-tests" element={<SuspenseWrapper><LabTestsPage /></SuspenseWrapper>} />
          <Route path="/inventory" element={<SuspenseWrapper><InventoryPage /></SuspenseWrapper>} />
          <Route path="/documents" element={<SuspenseWrapper><DocumentsPage /></SuspenseWrapper>} />
          <Route path="/pharmacy" element={<SuspenseWrapper><PharmacyPage /></SuspenseWrapper>} />
          <Route path="/settings" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />
          <Route path="/settings/clinic" element={<SuspenseWrapper><SettingsClinicPage /></SuspenseWrapper>} />
          <Route path="/settings/team" element={<SuspenseWrapper><SettingsTeamPage /></SuspenseWrapper>} />
          <Route path="/settings/team/join-requests" element={<SuspenseWrapper><SettingsTeamJoinRequestsPage /></SuspenseWrapper>} />
          <Route path="/settings/compliance" element={<SuspenseWrapper><SettingsCompliancePage /></SuspenseWrapper>} />
          <Route path="/settings/compliance/consent-template" element={<SuspenseWrapper><SettingsComplianceConsentTemplatePage /></SuspenseWrapper>} />
          <Route path="/settings/whatsapp-sender" element={<SuspenseWrapper><SettingsWhatsappSenderPage /></SuspenseWrapper>} />
          <Route path="/settings/templates" element={<SuspenseWrapper><SettingsTemplatesPage /></SuspenseWrapper>} />
          <Route path="/settings/appearance" element={<SuspenseWrapper><SettingsAppearancePage /></SuspenseWrapper>} />
          <Route path="/settings/queue" element={<SuspenseWrapper><SettingsQueuePage /></SuspenseWrapper>} />
          <Route path="/settings/clinical" element={<SuspenseWrapper><SettingsClinicalPage /></SuspenseWrapper>} />
          <Route path="/settings/security" element={<SuspenseWrapper><SettingsSecurityPage /></SuspenseWrapper>} />
          <Route path="/settings/notifications" element={<SuspenseWrapper><SettingsNotificationsPage /></SuspenseWrapper>} />
          <Route path="/settings/danger-zone" element={<SuspenseWrapper><SettingsDangerZonePage /></SuspenseWrapper>} />
          <Route path="/settings/doctor-profile" element={<SuspenseWrapper><SettingsDoctorProfilePage /></SuspenseWrapper>} />
          <Route path="/settings/availability" element={<SuspenseWrapper><SettingsAvailabilityPage /></SuspenseWrapper>} />
          <Route path="/settings/leave" element={<SuspenseWrapper><SettingsLeavePage /></SuspenseWrapper>} />
          <Route path="/settings/account" element={<SuspenseWrapper><SettingsAccountPage /></SuspenseWrapper>} />
          <Route path="/whatsapp" element={<SuspenseWrapper><WhatsAppPage /></SuspenseWrapper>} />
          <Route path="/inbox" element={<SuspenseWrapper><InboxPage /></SuspenseWrapper>} />
          <Route path="/analytics" element={<SuspenseWrapper><AnalyticsPage /></SuspenseWrapper>} />
          <Route path="/reports" element={<SuspenseWrapper><ReportsPage /></SuspenseWrapper>} />
          <Route path="/coding-queue" element={<SuspenseWrapper><CodingQueuePage /></SuspenseWrapper>} />
          <Route path="/daybook" element={<SuspenseWrapper><DaybookPage /></SuspenseWrapper>} />
          <Route path="/desk/collect-payment" element={<SuspenseWrapper><DeskCollectPaymentPage /></SuspenseWrapper>} />
          <Route path="/desk/floor" element={<SuspenseWrapper><DeskFloorPage /></SuspenseWrapper>} />
          <Route path="/help" element={<SuspenseWrapper><HelpPage /></SuspenseWrapper>} />
          <Route path="/profile" element={<SuspenseWrapper><ProfilePage /></SuspenseWrapper>} />
          <Route path="/templates" element={<SuspenseWrapper><TemplatesPage /></SuspenseWrapper>} />
          <Route path="/ai-assistant" element={<SuspenseWrapper><AiAssistantPage /></SuspenseWrapper>} />
          <Route path="/billing-locked" element={<SuspenseWrapper><BillingLockedPage /></SuspenseWrapper>} />
          <Route path="/upgrade" element={<SuspenseWrapper><UpgradePage /></SuspenseWrapper>} />
          <Route path="/hospital/beds" element={<SuspenseWrapper><HospitalBedsPage /></SuspenseWrapper>} />
          <Route path="/referrals" element={<SuspenseWrapper><ReferralsPage /></SuspenseWrapper>} />
          <Route path="/specialty" element={<SuspenseWrapper><SpecialtyPage /></SuspenseWrapper>} />
          <Route path="/specialty/dental-charts" element={<SuspenseWrapper><DentalChartsPage /></SuspenseWrapper>} />
          <Route path="/follow-ups" element={<SuspenseWrapper><FollowUpsPage /></SuspenseWrapper>} />
          <Route path="/import" element={<SuspenseWrapper><ImportsPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Root redirect ──────────────────────────── */}
        <Route path="/" element={<Navigate to="/today" replace />} />

        {/* ── 404 — MUST be last ─────────────────────── */}
        <Route path="*" element={<SuspenseWrapper><NotFoundPage /></SuspenseWrapper>} />
      </Route>
    </Routes>
  );
}
