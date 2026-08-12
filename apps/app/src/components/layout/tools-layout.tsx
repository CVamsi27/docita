import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";

export function ToolsLayout() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex" />
        <title>Tools - Docita</title>
      </Helmet>
      <Outlet />
    </>
  );
}
