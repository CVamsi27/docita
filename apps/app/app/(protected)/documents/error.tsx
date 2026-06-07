"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Documents"
// jscpd:ignore-end
      description="Please retry, or return to the dashboard."
      reset={reset}
    />
  );
}
