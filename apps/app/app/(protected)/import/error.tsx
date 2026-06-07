"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function ImportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Import"
      description="Please retry, or return to the dashboard."
      reset={reset}
    />
  );
}
