import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features | Docita",
  description: "Explore Docita's features",
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
