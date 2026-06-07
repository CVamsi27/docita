"use client";

import { useEffect } from "react";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function BedsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <ErrorPageShell
      title="Error loading Bed Management"
      description="We couldn't load Bed Management. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
