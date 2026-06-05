"use client";

import { useEffect } from "react";
import { ErrorPageShell } from "@/components/feedback/error-page-shell";

export default function DentalChartsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <ErrorPageShell
      title="Error loading Dental Charts"
      description="We couldn't load Dental Charts. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
