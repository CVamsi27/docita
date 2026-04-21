import type { Metadata } from "next";

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
