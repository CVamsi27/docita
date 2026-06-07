"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading settings"
// jscpd:ignore-end
      description="We couldn't load your settings page. Please try again."
      reset={reset}
    />
  );
}
