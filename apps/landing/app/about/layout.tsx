import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Docita",
  description: "Learn about Docita",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
