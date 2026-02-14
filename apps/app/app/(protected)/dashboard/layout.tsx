import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Docita",
  description: "Your clinic dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
