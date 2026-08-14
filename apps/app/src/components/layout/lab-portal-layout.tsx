import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";
import { LabPortalLayoutShell } from "@/features/lab-portal/components/layout/lab-portal-layout-shell";

export function LabPortalLayout() {
  return (
    <>
      <Helmet>
        <title>Lab Portal - Docita</title>
      </Helmet>
      <LabPortalLayoutShell>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </LabPortalLayoutShell>
    </>
  );
}
