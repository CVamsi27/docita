"use client";

import { useEffect } from "react";
import { ErrorPageShell } from "@/components/feedback/error-page-shell";

export default function AppointmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <ErrorPageShell
      title="We could not load appointments"
      description="We could not load this appointments page. Please try again in a moment."
      reset={reset}
    />
  );
}
