"use client";

import { useEffect } from "react";
import { ErrorPageShell } from "@/components/feedback/error-page-shell";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <ErrorPageShell
      title="Error loading settings"
      description="We couldn't load your settings page. Please try again."
      reset={reset}
    />
  );
}
