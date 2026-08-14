import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";

export function PublicLayout() {
  return (
    <>
      <Helmet>
        <title>Docita</title>
      </Helmet>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </>
  );
}
