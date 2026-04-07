import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | Docita Internal",
  description: "Manage system users",
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
