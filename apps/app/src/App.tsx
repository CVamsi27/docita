import { Suspense } from "react";
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
import * as authPages from "@/routes/route-pages-auth";
import * as clinicalPages from "@/routes/route-pages-clinical";
import * as settingsPages from "@/routes/route-pages-settings";
import * as portalPages from "@/routes/route-pages-portal";
import * as publicPages from "@/routes/route-pages-public";
import * as labPortalPages from "@/routes/route-pages-lab-portal";
import * as toolsPages from "@/routes/route-pages-tools";

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
          <SuspenseWrapper><PublicRoute><authPages.AuthPageContainer /></PublicRoute></SuspenseWrapper>
        } />
        <Route path="/forgot-password" element={
          <SuspenseWrapper><PublicRoute><authPages.ForgotPasswordPage /></PublicRoute></SuspenseWrapper>
        } />
        <Route path="/reset-password" element={
          <SuspenseWrapper><PublicRoute><authPages.ResetPasswordPage /></PublicRoute></SuspenseWrapper>
        } />

        {/* ── Setup Routes (auth required, no clinic) ── */}
        <Route element={<SetupLayout />}>
          <Route path="/choose-path" element={<SuspenseWrapper><authPages.ChoosePathPage /></SuspenseWrapper>} />
          <Route path="/clinic-selection" element={<SuspenseWrapper><authPages.ClinicSelectionPage /></SuspenseWrapper>} />
          <Route path="/join-clinic" element={<SuspenseWrapper><authPages.JoinClinicPage /></SuspenseWrapper>} />
          <Route path="/join-request-status" element={<SuspenseWrapper><authPages.JoinRequestStatusPage /></SuspenseWrapper>} />
          <Route path="/onboarding" element={<SuspenseWrapper><authPages.OnboardingPage /></SuspenseWrapper>} />
          <Route path="/verify-doctor" element={<SuspenseWrapper><authPages.VerifyDoctorPage /></SuspenseWrapper>} />
          <Route path="/verify-email" element={<SuspenseWrapper><authPages.VerifyEmailPage /></SuspenseWrapper>} />
          <Route path="/verify-email-sent" element={<SuspenseWrapper><authPages.VerifyEmailSentPage /></SuspenseWrapper>} />
          <Route path="/verify-email/verified" element={<SuspenseWrapper><authPages.VerifiedPage /></SuspenseWrapper>} />
          <Route path="/upload-signature/:token" element={<SuspenseWrapper><authPages.UploadSignatureTokenPage /></SuspenseWrapper>} />
          <Route path="/upload-signature/onboarding" element={<SuspenseWrapper><authPages.UploadSignatureOnboardingPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Portal Routes ─────────────────────────── */}
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<SuspenseWrapper><portalPages.PortalHomePage /></SuspenseWrapper>} />
          <Route path="/portal/login" element={<SuspenseWrapper><portalPages.PortalLoginPage /></SuspenseWrapper>} />
          <Route path="/portal/appointments" element={<SuspenseWrapper><portalPages.PortalAppointmentsPage /></SuspenseWrapper>} />
          <Route path="/portal/billing" element={<SuspenseWrapper><portalPages.PortalBillingPage /></SuspenseWrapper>} />
          <Route path="/portal/history" element={<SuspenseWrapper><portalPages.PortalHistoryPage /></SuspenseWrapper>} />
          <Route path="/portal/medications" element={<SuspenseWrapper><portalPages.PortalMedicationsPage /></SuspenseWrapper>} />
          <Route path="/portal/metrics" element={<SuspenseWrapper><portalPages.PortalMetricsPage /></SuspenseWrapper>} />
          <Route path="/portal/prescriptions" element={<SuspenseWrapper><portalPages.PortalPrescriptionsPage /></SuspenseWrapper>} />
          <Route path="/portal/profile" element={<SuspenseWrapper><portalPages.PortalProfilePage /></SuspenseWrapper>} />
          <Route path="/portal/profile/consent-form" element={<SuspenseWrapper><portalPages.PortalConsentFormPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Public Routes (partner, booking, upload) ── */}
        <Route element={<PublicLayout />}>
          <Route path="/book/:referralCode" element={<SuspenseWrapper><publicPages.BookingPage /></SuspenseWrapper>} />
          <Route path="/mobile-upload/:id" element={<SuspenseWrapper><publicPages.MobileUploadPage /></SuspenseWrapper>} />
          <Route path="/partner" element={<SuspenseWrapper><publicPages.PartnerHomePage /></SuspenseWrapper>} />
          <Route path="/partner/login" element={<SuspenseWrapper><publicPages.PartnerLoginPage /></SuspenseWrapper>} />
          <Route path="/partner/dashboard" element={<SuspenseWrapper><publicPages.PartnerDashboardPage /></SuspenseWrapper>} />
          <Route path="/partner/banking" element={<SuspenseWrapper><publicPages.PartnerBankingPage /></SuspenseWrapper>} />
          <Route path="/partner/payouts" element={<SuspenseWrapper><publicPages.PartnerPayoutsPage /></SuspenseWrapper>} />
          <Route path="/partner/referrals" element={<SuspenseWrapper><publicPages.PartnerReferralsPage /></SuspenseWrapper>} />
          <Route path="/partner/share" element={<SuspenseWrapper><publicPages.PartnerSharePage /></SuspenseWrapper>} />
          <Route path="/partner/submit-lead" element={<SuspenseWrapper><publicPages.PartnerSubmitLeadPage /></SuspenseWrapper>} />
          <Route path="/partner/submissions" element={<SuspenseWrapper><publicPages.PartnerMySubmissionsPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Lab Portal Routes ─────────────────────── */}
        <Route element={<LabPortalLayout />}>
          <Route path="/lab-portal" element={<SuspenseWrapper><labPortalPages.LabPortalHomePage /></SuspenseWrapper>} />
          <Route path="/lab-portal/login" element={<SuspenseWrapper><labPortalPages.LabPortalLoginPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Tools Routes (dev-only) ────────────────── */}
        <Route element={<ToolsLayout />}>
          <Route path="/visual-test/:fixture" element={<SuspenseWrapper><toolsPages.VisualTestPage /></SuspenseWrapper>} />
          <Route path="/e2e-session-seed" element={<SuspenseWrapper><toolsPages.E2ESessionSeedPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Protected Routes (clinic app) ──────────── */}
        <Route element={<ProtectedLayout />}>
          <Route path="/today" element={<SuspenseWrapper><clinicalPages.TodayPage /></SuspenseWrapper>} />
          <Route path="/dashboard" element={<Navigate to="/today" replace />} />
          <Route path="/consultation" element={<SuspenseWrapper><clinicalPages.ConsultationListPage /></SuspenseWrapper>} />
          <Route path="/consultation/:id" element={<SuspenseWrapper><clinicalPages.ConsultationDetailPage /></SuspenseWrapper>} />
          <Route path="/appointments" element={<SuspenseWrapper><clinicalPages.AppointmentsPage /></SuspenseWrapper>} />
          <Route path="/patients" element={<SuspenseWrapper><clinicalPages.PatientsListPage /></SuspenseWrapper>} />
          <Route path="/patients/:id" element={<SuspenseWrapper><clinicalPages.PatientDetailPage /></SuspenseWrapper>} />
          <Route path="/prescriptions" element={<SuspenseWrapper><clinicalPages.PrescriptionsListPage /></SuspenseWrapper>} />
          <Route path="/prescriptions/:id" element={<SuspenseWrapper><clinicalPages.PrescriptionDetailPage /></SuspenseWrapper>} />
          <Route path="/invoices" element={<SuspenseWrapper><clinicalPages.InvoicesListPage /></SuspenseWrapper>} />
          <Route path="/invoices/new" element={<SuspenseWrapper><clinicalPages.InvoiceNewPage /></SuspenseWrapper>} />
          <Route path="/invoices/:id" element={<SuspenseWrapper><clinicalPages.InvoiceDetailPage /></SuspenseWrapper>} />
          <Route path="/invoices/:id/edit" element={<SuspenseWrapper><clinicalPages.InvoiceEditPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims" element={<SuspenseWrapper><clinicalPages.ClaimsListPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims/new" element={<SuspenseWrapper><clinicalPages.ClaimNewPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims/:id" element={<SuspenseWrapper><clinicalPages.ClaimDetailPage /></SuspenseWrapper>} />
          <Route path="/insurance-claims/:id/edit" element={<SuspenseWrapper><clinicalPages.ClaimEditPage /></SuspenseWrapper>} />
          <Route path="/lab-tests" element={<SuspenseWrapper><clinicalPages.LabTestsPage /></SuspenseWrapper>} />
          <Route path="/inventory" element={<SuspenseWrapper><clinicalPages.InventoryPage /></SuspenseWrapper>} />
          <Route path="/documents" element={<SuspenseWrapper><clinicalPages.DocumentsPage /></SuspenseWrapper>} />
          <Route path="/pharmacy" element={<SuspenseWrapper><clinicalPages.PharmacyPage /></SuspenseWrapper>} />
          <Route path="/settings" element={<SuspenseWrapper><settingsPages.SettingsPage /></SuspenseWrapper>} />
          <Route path="/settings/clinic" element={<SuspenseWrapper><settingsPages.SettingsClinicPage /></SuspenseWrapper>} />
          <Route path="/settings/team" element={<SuspenseWrapper><settingsPages.SettingsTeamPage /></SuspenseWrapper>} />
          <Route path="/settings/team/join-requests" element={<SuspenseWrapper><settingsPages.SettingsTeamJoinRequestsPage /></SuspenseWrapper>} />
          <Route path="/settings/compliance" element={<SuspenseWrapper><settingsPages.SettingsCompliancePage /></SuspenseWrapper>} />
          <Route path="/settings/compliance/consent-template" element={<SuspenseWrapper><settingsPages.SettingsComplianceConsentTemplatePage /></SuspenseWrapper>} />
          <Route path="/settings/whatsapp-sender" element={<SuspenseWrapper><settingsPages.SettingsWhatsappSenderPage /></SuspenseWrapper>} />
          <Route path="/settings/templates" element={<SuspenseWrapper><settingsPages.SettingsTemplatesPage /></SuspenseWrapper>} />
          <Route path="/settings/appearance" element={<SuspenseWrapper><settingsPages.SettingsAppearancePage /></SuspenseWrapper>} />
          <Route path="/settings/queue" element={<SuspenseWrapper><settingsPages.SettingsQueuePage /></SuspenseWrapper>} />
          <Route path="/settings/clinical" element={<SuspenseWrapper><settingsPages.SettingsClinicalPage /></SuspenseWrapper>} />
          <Route path="/settings/security" element={<SuspenseWrapper><settingsPages.SettingsSecurityPage /></SuspenseWrapper>} />
          <Route path="/settings/notifications" element={<SuspenseWrapper><settingsPages.SettingsNotificationsPage /></SuspenseWrapper>} />
          <Route path="/settings/danger-zone" element={<SuspenseWrapper><settingsPages.SettingsDangerZonePage /></SuspenseWrapper>} />
          <Route path="/settings/doctor-profile" element={<SuspenseWrapper><settingsPages.SettingsDoctorProfilePage /></SuspenseWrapper>} />
          <Route path="/settings/availability" element={<SuspenseWrapper><settingsPages.SettingsAvailabilityPage /></SuspenseWrapper>} />
          <Route path="/settings/leave" element={<SuspenseWrapper><settingsPages.SettingsLeavePage /></SuspenseWrapper>} />
          <Route path="/settings/account" element={<SuspenseWrapper><settingsPages.SettingsAccountPage /></SuspenseWrapper>} />
          <Route path="/whatsapp" element={<SuspenseWrapper><clinicalPages.WhatsAppPage /></SuspenseWrapper>} />
          <Route path="/inbox" element={<SuspenseWrapper><clinicalPages.InboxPage /></SuspenseWrapper>} />
          <Route path="/analytics" element={<SuspenseWrapper><clinicalPages.AnalyticsPage /></SuspenseWrapper>} />
          <Route path="/reports" element={<SuspenseWrapper><clinicalPages.ReportsPage /></SuspenseWrapper>} />
          <Route path="/coding-queue" element={<SuspenseWrapper><clinicalPages.CodingQueuePage /></SuspenseWrapper>} />
          <Route path="/daybook" element={<SuspenseWrapper><clinicalPages.DaybookPage /></SuspenseWrapper>} />
          <Route path="/desk/collect-payment" element={<SuspenseWrapper><clinicalPages.DeskCollectPaymentPage /></SuspenseWrapper>} />
          <Route path="/desk/floor" element={<SuspenseWrapper><clinicalPages.DeskFloorPage /></SuspenseWrapper>} />
          <Route path="/help" element={<SuspenseWrapper><clinicalPages.HelpPage /></SuspenseWrapper>} />
          <Route path="/profile" element={<SuspenseWrapper><clinicalPages.ProfilePage /></SuspenseWrapper>} />
          <Route path="/templates" element={<SuspenseWrapper><clinicalPages.TemplatesPage /></SuspenseWrapper>} />
          <Route path="/ai-assistant" element={<SuspenseWrapper><clinicalPages.AiAssistantPage /></SuspenseWrapper>} />
          <Route path="/billing-locked" element={<SuspenseWrapper><clinicalPages.BillingLockedPage /></SuspenseWrapper>} />
          <Route path="/upgrade" element={<SuspenseWrapper><clinicalPages.UpgradePage /></SuspenseWrapper>} />
          <Route path="/hospital/beds" element={<SuspenseWrapper><clinicalPages.HospitalBedsPage /></SuspenseWrapper>} />
          <Route path="/referrals" element={<SuspenseWrapper><clinicalPages.ReferralsPage /></SuspenseWrapper>} />
          <Route path="/specialty" element={<SuspenseWrapper><clinicalPages.SpecialtyPage /></SuspenseWrapper>} />
          <Route path="/specialty/dental-charts" element={<SuspenseWrapper><clinicalPages.DentalChartsPage /></SuspenseWrapper>} />
          <Route path="/follow-ups" element={<SuspenseWrapper><clinicalPages.FollowUpsPage /></SuspenseWrapper>} />
          <Route path="/import" element={<SuspenseWrapper><clinicalPages.ImportsPage /></SuspenseWrapper>} />
        </Route>

        {/* ── Root redirect ──────────────────────────── */}
        <Route path="/" element={<Navigate to="/today" replace />} />

        {/* ── 404 — MUST be last ─────────────────────── */}
        <Route path="*" element={<SuspenseWrapper><toolsPages.NotFoundPage /></SuspenseWrapper>} />
      </Route>
    </Routes>
  );
}
