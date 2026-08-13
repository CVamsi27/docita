import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";

export function SetupLayout() {
  return (
    <>
      <Helmet>
        <title>Setup - Docita</title>
      </Helmet>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </>
  );
}
