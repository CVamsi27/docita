import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Appointments | Docita",
  description: "Manage your appointments",
};

export default function AppointmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
