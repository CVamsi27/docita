"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function InvoicesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading invoices"
      description="Invoice data is unavailable right now. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
