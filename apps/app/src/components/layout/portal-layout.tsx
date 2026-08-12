import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";
import { ErrorBoundaryWrapper } from "@/components/errors/error-boundary";
import { PortalLayoutShell } from "@/features/patient-portal/components/layout/portal-layout-shell";

export function PortalLayout() {
  return (
    <>
      <Helmet>
        <title>Patient Portal - Docita</title>
      </Helmet>
      <PortalLayoutShell>
        <ErrorBoundaryWrapper>
          <Outlet />
        </ErrorBoundaryWrapper>
      </PortalLayoutShell>
    </>
  );
}
