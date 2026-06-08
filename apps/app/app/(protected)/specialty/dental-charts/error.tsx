"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

// jscpd:ignore-start
export default function DentalChartsError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {
// jscpd:ignore-end

  return (
    <ErrorPageShell
      title="Error loading Dental Charts"
      description="We couldn't load Dental Charts. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
