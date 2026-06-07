"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function PrescriptionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Prescriptions"
// jscpd:ignore-end
      description="We could not load Prescriptions. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
