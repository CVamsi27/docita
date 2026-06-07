"use client";

import { useEffect } from "react";
import { logger } from "@/lib/monitoring/logger";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function UpgradeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Upgrade page error", { error });
  }, [error]);

  return (
    <ErrorPageShell
      title="Error loading Upgrade"
      description="We couldn't load the upgrade page. Please retry or return to the dashboard."
      reset={reset}
      error={error}
    />
  );
}
