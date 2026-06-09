"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function AiAssistantError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading AI Assistant"
// jscpd:ignore-end
      description="We couldn't load AI Assistant. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
