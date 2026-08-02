import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";
import { ErrorBoundaryWrapper } from "@/components/errors/error-boundary";
import { LabPortalLayoutShell } from "@/features/lab-portal/components/layout/lab-portal-layout-shell";

export function LabPortalLayout() {
  return (
    <>
      <Helmet>
        <title>Lab Portal - Docita</title>
      </Helmet>
      <LabPortalLayoutShell>
        <ErrorBoundaryWrapper>
          <Outlet />
        </ErrorBoundaryWrapper>
      </LabPortalLayoutShell>
    </>
  );
}
