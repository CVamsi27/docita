import type { ReactNode } from "react";
import { notFound } from "next/navigation";

function toolsEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return (
    process.env.NEXT_PUBLIC_ENABLE_TOOLS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_VISUAL_TESTS === "true"
  );
}

export default function ToolsLayout({ children }: { children: ReactNode }) {
  if (!toolsEnabled()) {
    notFound();
  }
  return children;
}
