import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";
import { ErrorBoundaryWrapper } from "@/components/errors/error-boundary";

export function SetupLayout() {
  return (
    <>
      <Helmet>
        <title>Setup - Docita</title>
      </Helmet>
      <ErrorBoundaryWrapper>
        <Outlet />
      </ErrorBoundaryWrapper>
    </>
  );
}
