import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Docita Admin",
  description: "Admin dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
