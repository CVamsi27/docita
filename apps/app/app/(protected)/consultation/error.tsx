"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/monitoring/sentry.client.config";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function ConsultationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest, scope: "consultation" });
  }, [error]);

  return (
    <ErrorPageShell
      title="Error loading consultation"
      description="We couldn't load the consultation workspace. Please retry."
      reset={reset}
      error={error}
    />
  );
}
