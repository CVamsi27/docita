"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function BedsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Bed Management"
// jscpd:ignore-end
      description="We couldn't load Bed Management. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
