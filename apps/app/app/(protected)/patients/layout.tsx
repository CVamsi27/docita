import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patients | Docita",
  description: "Manage your patients",
};

export default function PatientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
