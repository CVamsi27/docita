"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function AppointmentsError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="We could not load appointments"
// jscpd:ignore-end
      description="We could not load this appointments page. Please try again in a moment."
      reset={reset}
    />
  );
}
