"use client";

import { useEffect } from "react";
import { ErrorPageShell } from "@/components/feedback/error-page-shell";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <ErrorPageShell
      title="Error loading Profile"
      description="We couldn't load Profile. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
