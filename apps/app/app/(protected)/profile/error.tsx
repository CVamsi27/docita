"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Profile"
// jscpd:ignore-end
      description="We couldn't load Profile. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
