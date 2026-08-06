import { lazy } from "react";

export const PortalHomePage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalHomePage })),
);
export const PortalLoginPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalLoginPage })),
);
export const PortalAppointmentsPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalAppointmentsPage })),
);
export const PortalBillingPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalBillingPage })),
);
export const PortalHistoryPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalHistoryPage })),
);
export const PortalMedicationsPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalMedicationsPage })),
);
export const PortalMetricsPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalMetricsPage })),
);
export const PortalPrescriptionsPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalPrescriptionsPage })),
);
export const PortalProfilePage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalProfilePage })),
);
export const PortalConsentFormPage = lazy(() =>
  import("@/features/patient-portal/pages/portal-pages").then((m) => ({ default: m.PortalConsentFormPage })),
);
