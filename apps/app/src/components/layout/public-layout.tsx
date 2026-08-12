import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";
import { ErrorBoundaryWrapper } from "@/components/errors/error-boundary";

export function PublicLayout() {
  return (
    <>
      <Helmet>
        <title>Docita</title>
      </Helmet>
      <ErrorBoundaryWrapper>
        <Outlet />
      </ErrorBoundaryWrapper>
    </>
  );
}
