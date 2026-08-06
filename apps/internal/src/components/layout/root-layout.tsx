import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";

export function RootLayout() {
  return (
    <>
      <Helmet>
        <title>Docita – Internal</title>
        <meta name="description" content="Docita Internal Admin Dashboard" />
      </Helmet>
      <Outlet />
    </>
  );
}
