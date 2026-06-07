"use client";

import { useEffect } from "react";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <ErrorPageShell
      title="Error loading analytics"
      description="Analytics data is temporarily unavailable. Please retry."
      reset={reset}
    />
  );
}
