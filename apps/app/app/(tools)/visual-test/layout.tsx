import type { ReactNode } from "react";
import { notFound } from "next/navigation";

function visualTestsEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_VISUAL_TESTS === "true"
  );
}

export default function VisualTestLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!visualTestsEnabled()) {
    notFound();
  }

  return children;
}
