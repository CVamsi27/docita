"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function LabTestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Lab Tests"
      description="We could not load Lab Tests. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
