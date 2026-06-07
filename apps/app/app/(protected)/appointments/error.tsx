"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function AppointmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="We could not load appointments"
      description="We could not load this appointments page. Please try again in a moment."
      reset={reset}
    />
  );
}
