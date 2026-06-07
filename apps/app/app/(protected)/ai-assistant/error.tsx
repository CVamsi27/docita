"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function AiAssistantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading AI Assistant"
      description="We couldn't load AI Assistant. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
