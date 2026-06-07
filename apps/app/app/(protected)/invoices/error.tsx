"use client";

// jscpd:ignore-start
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
// jscpd:ignore-end
      description="Invoice data is unavailable right now. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
