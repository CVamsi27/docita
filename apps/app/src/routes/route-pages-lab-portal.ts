import { lazy } from "react";

export const LabPortalHomePage = lazy(() =>
  import("@/features/lab-portal/pages/lab-portal-pages").then((m) => ({ default: m.LabPortalHomePage })),
);
export const LabPortalLoginPage = lazy(() =>
  import("@/features/lab-portal/pages/lab-portal-pages").then((m) => ({ default: m.LabPortalLoginPage })),
);
