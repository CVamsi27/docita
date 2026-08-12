import { Outlet } from "react-router";
import { Helmet } from "react-helmet-async";

export function RootLayout() {
  return (
    <>
      <Helmet>
        <title>Docita - Healthcare OS</title>
        <meta name="description" content="The operating system for modern healthcare facilities" />
      </Helmet>
      <Outlet />
    </>
  );
}