import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router";
import { RootLayout } from "./components/layout/root-layout";
import { ProtectedLayout } from "./components/layout/protected-layout";
import { LoginPage } from "./components/layout/login-page";
import { InternalProtectedGate } from "@/lib/auth/internal-protected-gate";

const DashboardPage = lazy(() => import("./features/dashboard/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import("./features/users/pages/users-page").then((m) => ({ default: m.UsersPage })));
const DoctorsPage = lazy(() => import("./features/doctors/pages/doctors-page").then((m) => ({ default: m.DoctorsPage })));
const BillingPage = lazy(() => import("./features/billing/pages/billing-page").then((m) => ({ default: m.BillingPage })));
const PricingPage = lazy(() => import("./features/pricing/pages/pricing-page").then((m) => ({ default: m.PricingPage })));
const AnalyticsPage = lazy(() => import("./features/analytics/pages/analytics-page").then((m) => ({ default: m.AnalyticsPage })));
const SupportPage = lazy(() => import("./features/support/pages/support-page").then((m) => ({ default: m.SupportPage })));
const PaymentProcessingPage = lazy(() => import("./features/payment-processing/pages/payment-processing-page").then((m) => ({ default: m.PaymentProcessingPage })));
const BroadcastsPage = lazy(() => import("./features/broadcasts/pages/broadcasts-page").then((m) => ({ default: m.BroadcastsPage })));
const AuditsPage = lazy(() => import("./features/audits/pages/audits-page").then((m) => ({ default: m.AuditsPage })));
const ReferralsPage = lazy(() => import("./features/referrals/pages/referrals-page").then((m) => ({ default: m.ReferralsPage })));
const LeadsPage = lazy(() => import("./features/leads/pages/leads-page").then((m) => ({ default: m.LeadsPage })));
const EnterpriseContractsPage = lazy(() => import("./features/enterprise-contracts/pages/enterprise-contracts-page").then((m) => ({ default: m.EnterpriseContractsPage })));
const AdminsPage = lazy(() => import("./features/admins/pages/admins-page").then((m) => ({ default: m.AdminsPage })));
const FeedbackPage = lazy(() => import("./features/feedback/pages/feedback-page").then((m) => ({ default: m.FeedbackPage })));
const LogsPage = lazy(() => import("./features/logs/pages/logs-page").then((m) => ({ default: m.LogsPage })));
const PerformancePage = lazy(() => import("./features/performance/pages/performance-page").then((m) => ({ default: m.PerformancePage })));
const SystemMonitoringPage = lazy(() => import("./features/system-monitoring/pages/system-monitoring-page").then((m) => ({ default: m.SystemMonitoringPage })));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<ProtectedLayout />}>
          <Route
            element={
              <InternalProtectedGate>
                <Outlet />
              </InternalProtectedGate>
            }
          >
            <Route path="/dashboard" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
            <Route path="/users" element={<SuspenseWrapper><UsersPage /></SuspenseWrapper>} />
          <Route path="/doctors" element={<SuspenseWrapper><DoctorsPage /></SuspenseWrapper>} />
          <Route path="/billing" element={<SuspenseWrapper><BillingPage /></SuspenseWrapper>} />
          <Route path="/pricing" element={<SuspenseWrapper><PricingPage /></SuspenseWrapper>} />
          <Route path="/analytics" element={<SuspenseWrapper><AnalyticsPage /></SuspenseWrapper>} />
          <Route path="/support" element={<SuspenseWrapper><SupportPage /></SuspenseWrapper>} />
          <Route path="/payment-processing" element={<SuspenseWrapper><PaymentProcessingPage /></SuspenseWrapper>} />
          <Route path="/broadcasts" element={<SuspenseWrapper><BroadcastsPage /></SuspenseWrapper>} />
          <Route path="/audits" element={<SuspenseWrapper><AuditsPage /></SuspenseWrapper>} />
          <Route path="/referrals" element={<SuspenseWrapper><ReferralsPage /></SuspenseWrapper>} />
          <Route path="/leads" element={<SuspenseWrapper><LeadsPage /></SuspenseWrapper>} />
          <Route path="/enterprise-contracts" element={<SuspenseWrapper><EnterpriseContractsPage /></SuspenseWrapper>} />
          <Route path="/admins" element={<SuspenseWrapper><AdminsPage /></SuspenseWrapper>} />
          <Route path="/feedback" element={<SuspenseWrapper><FeedbackPage /></SuspenseWrapper>} />
          <Route path="/logs" element={<SuspenseWrapper><LogsPage /></SuspenseWrapper>} />
          <Route path="/performance" element={<SuspenseWrapper><PerformancePage /></SuspenseWrapper>} />
          <Route path="/system-monitoring" element={<SuspenseWrapper><SystemMonitoringPage /></SuspenseWrapper>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
