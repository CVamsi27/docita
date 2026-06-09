"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function AnalyticsError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading analytics"
// jscpd:ignore-end
      description="Analytics data is temporarily unavailable. Please retry."
      reset={reset}
    />
  );
}
