"use client";

import Link from "next/link";
import { NotFoundContent } from "@workspace/ui/components/feedback/not-found-content";

export default function NotFound() {
  return (
    <NotFoundContent>
      <Link
        href="/today"
        style={{
          padding: "0 20px",
          height: 40,
          borderRadius: 8,
          background: "var(--color-foreground)",
          color: "var(--color-background)",
          display: "inline-flex",
          alignItems: "center",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          transition: "opacity 0.15s",
        }}
      >
        Go to workspace
      </Link>
      <Link
        href="/login"
        style={{
          padding: "0 20px",
          height: 40,
          borderRadius: 8,
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
          display: "inline-flex",
          alignItems: "center",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          transition: "opacity 0.15s",
        }}
      >
        Go back
      </Link>
    </NotFoundContent>
  );
}
