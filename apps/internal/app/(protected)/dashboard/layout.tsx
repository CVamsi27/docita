import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Docita Internal",
  description: "Admin dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
