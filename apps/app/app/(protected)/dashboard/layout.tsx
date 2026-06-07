import type { Metadata } from "next";

// jscpd:ignore-start
export const metadata: Metadata = {
  title: "Dashboard | Docita",
  description: "Your facility dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
// jscpd:ignore-end
