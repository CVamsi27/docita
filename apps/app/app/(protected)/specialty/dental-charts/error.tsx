"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function DentalChartsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Dental Charts"
      description="We couldn't load Dental Charts. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
